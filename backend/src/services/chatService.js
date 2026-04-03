const { query } = require('../config/db');
const { withTransaction, sanitizeMessageRow } = require('../utils/eventHelpers');
const { parseMentionTokens, resolveMentionedUsers } = require('../utils/mentionParser');

const MANAGER_ROLES = new Set(['Organizer', 'Coordinator']);

const hasEventAccess = async (userId, eventId) => {
  const result = await query(
    `SELECT 1
     FROM events e
     LEFT JOIN event_members em ON em.event_id = e.id
     WHERE e.id = $1
       AND (e.created_by = $2 OR em.user_id = $2)
     LIMIT 1`,
    [eventId, userId]
  );
  return result.rows.length > 0;
};

const canManagePins = async (userId, eventId) => {
  const result = await query(
    `SELECT CASE
       WHEN e.created_by = $2 THEN 'Organizer'
       ELSE em.role
     END AS role
     FROM events e
     LEFT JOIN event_members em ON em.event_id = e.id AND em.user_id = $2
     WHERE e.id = $1`,
    [eventId, userId]
  );
  return MANAGER_ROLES.has(result.rows[0]?.role);
};

const getEventMembers = async (eventId) => {
  const result = await query(
    `SELECT u.id AS user_id, u.name, u.email
     FROM event_members em
     JOIN users u ON u.id = em.user_id
     WHERE em.event_id = $1`,
    [eventId]
  );
  return result.rows;
};

const hydrateMessageRows = async (eventId, currentUserId) => {
  const result = await query(
    `SELECT m.id,
            m.event_id,
            m.user_id,
            m.message,
            m.parent_message_id,
            m.created_at,
            m.updated_at,
            m.deleted_at,
            m.is_pinned,
            m.attachment_count,
            u.name AS sender_name,
            u.email AS sender_email,
            (
              SELECT COUNT(*)
              FROM event_messages child
              WHERE child.parent_message_id = m.id
                AND child.deleted_at IS NULL
            )::int AS thread_reply_count,
            (
              SELECT COUNT(*)
              FROM message_reads mr
              WHERE mr.message_id = m.id
            )::int AS read_by_count
     FROM event_messages m
     LEFT JOIN users u ON u.id = m.user_id
     WHERE m.event_id = $1
       AND m.deleted_at IS NULL
     ORDER BY m.is_pinned DESC, m.created_at ASC`,
    [eventId]
  );

  const ids = result.rows.map((row) => row.id);
  const attachmentsResult = ids.length
    ? await query(
        `SELECT id, message_id, original_name, mime_type, size_bytes, url_path, created_at
         FROM message_attachments
         WHERE message_id = ANY($1::uuid[])
         ORDER BY created_at ASC`,
        [ids]
      )
    : { rows: [] };
  const mentionsResult = ids.length
    ? await query(
        `SELECT message_id, mentioned_user_id
         FROM message_mentions
         WHERE message_id = ANY($1::uuid[])`,
        [ids]
      )
    : { rows: [] };

  const attachmentsByMessage = attachmentsResult.rows.reduce((acc, row) => {
    acc[row.message_id] = acc[row.message_id] || [];
    acc[row.message_id].push({
      id: row.id,
      original_name: row.original_name,
      mime_type: row.mime_type,
      size_bytes: Number(row.size_bytes),
      url_path: row.url_path,
      created_at: row.created_at,
    });
    return acc;
  }, {});

  const mentionsByMessage = mentionsResult.rows.reduce((acc, row) => {
    acc[row.message_id] = acc[row.message_id] || [];
    acc[row.message_id].push(row.mentioned_user_id);
    return acc;
  }, {});

  return result.rows.map((row) => ({
    ...sanitizeMessageRow(row, currentUserId),
    parent_message_id: row.parent_message_id,
    thread_reply_count: Number(row.thread_reply_count || 0),
    attachment_count: Number(row.attachment_count || 0),
    attachments: attachmentsByMessage[row.id] || [],
    mentions: mentionsByMessage[row.id] || [],
    read_by_count: Number(row.read_by_count || 0),
  }));
};

const createMessage = async ({ eventId, userId, message, parentMessageId = null }) => {
  const trimmed = String(message || '').trim();
  if (!trimmed) {
    const error = new Error('Message is required.');
    error.statusCode = 400;
    throw error;
  }

  return withTransaction(async (client) => {
    // Thread replies must belong to the same event room.
    if (parentMessageId) {
      const parentCheck = await client.query(
        `SELECT id FROM event_messages
         WHERE id = $1 AND event_id = $2 AND deleted_at IS NULL`,
        [parentMessageId, eventId]
      );
      if (parentCheck.rows.length === 0) {
        const error = new Error('Parent message does not exist in this event.');
        error.statusCode = 400;
        throw error;
      }
    }

    const inserted = await client.query(
      `INSERT INTO event_messages (event_id, user_id, message, parent_message_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [eventId, userId, trimmed, parentMessageId]
    );
    const messageRow = inserted.rows[0];

    const members = await client.query(
      `SELECT u.id AS user_id, u.name, u.email
       FROM event_members em
       JOIN users u ON u.id = em.user_id
       WHERE em.event_id = $1`,
      [eventId]
    );
    const mentionTokens = parseMentionTokens(trimmed);
    const mentionedUsers = resolveMentionedUsers(mentionTokens, members.rows).filter((member) => member.user_id !== userId);

    for (const member of mentionedUsers) {
      await client.query(
        `INSERT INTO message_mentions (message_id, event_id, mentioned_user_id, mentioned_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (message_id, mentioned_user_id) DO NOTHING`,
        [messageRow.id, eventId, member.user_id, userId]
      );
    }

    await client.query(
      `INSERT INTO message_reads (message_id, event_id, user_id, read_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (message_id, user_id)
       DO UPDATE SET read_at = EXCLUDED.read_at`,
      [messageRow.id, eventId, userId]
    );

    const senderResult = await client.query('SELECT name, email FROM users WHERE id = $1', [userId]);
    return {
      ...messageRow,
      sender_name: senderResult.rows[0]?.name || null,
      sender_email: senderResult.rows[0]?.email || null,
      mentions: mentionedUsers.map((member) => member.user_id),
    };
  });
};

const setMessagePinned = async ({ eventId, messageId, pinned }) => {
  const result = await query(
    `UPDATE event_messages
     SET is_pinned = $1, updated_at = NOW()
     WHERE id = $2 AND event_id = $3 AND deleted_at IS NULL
     RETURNING id, event_id, is_pinned, updated_at`,
    [Boolean(pinned), messageId, eventId]
  );
  return result.rows[0] || null;
};

const markEventRead = async ({ eventId, userId, messageIds = [] }) => {
  const ids = Array.isArray(messageIds) ? messageIds.filter(Boolean) : [];
  if (!ids.length) {
    const eventMessages = await query(
      `SELECT id FROM event_messages
       WHERE event_id = $1 AND deleted_at IS NULL`,
      [eventId]
    );
    ids.push(...eventMessages.rows.map((row) => row.id));
  }

  if (!ids.length) return 0;

  const result = await query(
    `INSERT INTO message_reads (message_id, event_id, user_id, read_at)
     SELECT m.id, m.event_id, $2, NOW()
     FROM event_messages m
     WHERE m.id = ANY($1::uuid[]) AND m.event_id = $3
     ON CONFLICT (message_id, user_id)
     DO UPDATE SET read_at = EXCLUDED.read_at
     RETURNING id`,
    [ids, userId, eventId]
  );
  return result.rows.length;
};

const getUnreadMentionsCount = async ({ eventId, userId }) => {
  const result = await query(
    `SELECT COUNT(*)::int AS unread_count
     FROM message_mentions
     WHERE event_id = $1
       AND mentioned_user_id = $2
       AND read_at IS NULL`,
    [eventId, userId]
  );
  return result.rows[0]?.unread_count || 0;
};

const markMentionsRead = async ({ eventId, userId, messageIds }) => {
  if (!Array.isArray(messageIds) || messageIds.length === 0) return 0;
  const result = await query(
    `UPDATE message_mentions
     SET read_at = NOW()
     WHERE event_id = $1
       AND mentioned_user_id = $2
       AND message_id = ANY($3::uuid[])
       AND read_at IS NULL
     RETURNING id`,
    [eventId, userId, messageIds]
  );
  return result.rows.length;
};

module.exports = {
  hasEventAccess,
  canManagePins,
  getEventMembers,
  hydrateMessageRows,
  createMessage,
  setMessagePinned,
  markEventRead,
  getUnreadMentionsCount,
  markMentionsRead,
};
