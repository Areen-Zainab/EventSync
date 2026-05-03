const { query } = require('../config/db');
const { getIo } = require('../realtime/io');
const { getPlanLimits, normalizePlan } = require('../utils/planLimits');
const {
  VALID_MEMBER_ROLES,
  withTransaction,
  computeEventStatus,
  sanitizeEventRow,
  sanitizeTaskRow,
  sanitizeMemberRow,
  sanitizeMessageRow,
  buildActivityEntry,
} = require('../utils/eventHelpers');

const VALID_TASK_STATUSES = new Set(['pending', 'in_progress', 'done']);
const VALID_PRIORITIES = new Set(['low', 'medium', 'high']);

const isUuid = (value) =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const roomName = (eventId) => `event:${eventId}`;

const getUserPlanRecord = async (db, userId) => {
  const result = await db(`SELECT COALESCE(plan, 'free') AS plan FROM users WHERE id = $1`, [userId]);
  return normalizePlan(result.rows[0]?.plan || 'free');
};

const buildEventLimitMessage = (plan, limit) =>
  `Your ${plan} plan allows up to ${limit} active event${limit === 1 ? '' : 's'}. Upgrade to create more.`;

const buildMemberLimitMessage = (plan, limit) =>
  `Your ${plan} plan allows up to ${limit} members in this event. Upgrade to add more members.`;

const hasEventAccess = async (db, userId, eventId) => {
  const result = await db(
    `SELECT 1
     FROM events e
     LEFT JOIN event_members em ON em.event_id = e.id AND em.user_id = $2
     WHERE e.id = $1
       AND (e.created_by = $2 OR em.user_id IS NOT NULL)`,
    [eventId, userId]
  );

  return result.rows.length > 0;
};

const getEventRole = async (db, userId, eventId) => {
  const result = await db(
    `SELECT CASE
       WHEN e.created_by = $2 THEN 'Organizer'
       ELSE em.role
     END AS role
     FROM events e
     LEFT JOIN event_members em ON em.event_id = e.id AND em.user_id = $2
     WHERE e.id = $1`,
    [eventId, userId]
  );

  return result.rows[0]?.role || null;
};

const canManageEvent = async (db, userId, eventId) => {
  const role = await getEventRole(db, userId, eventId);
  return role === 'Organizer' || role === 'Coordinator';
};

const parseMentionUserIds = async (db, eventId, message) => {
  const text = String(message || '');
  const mentions = [...text.matchAll(/@([a-zA-Z0-9._-]{2,50})/g)].map((match) => match[1].toLowerCase());
  if (mentions.length === 0) return [];

  const membersResult = await db(
    `SELECT u.id, LOWER(u.name) AS lowered_name, LOWER(split_part(u.email, '@', 1)) AS lowered_email_name
     FROM event_members em
     JOIN users u ON u.id = em.user_id
     WHERE em.event_id = $1`,
    [eventId]
  );

  const lookup = new Map();
  for (const row of membersResult.rows) {
    if (row.lowered_name) lookup.set(row.lowered_name, row.id);
    if (row.lowered_email_name) lookup.set(row.lowered_email_name, row.id);
  }

  return [...new Set(mentions.map((m) => lookup.get(m)).filter(Boolean))];
};

const loadMessageById = async (db, messageId, currentUserId = null) => {
  const result = await db(
    `SELECT m.id,
            m.event_id,
            m.user_id,
            m.message,
            m.created_at,
            m.updated_at,
            m.deleted_at,
            m.is_pinned,
            m.parent_message_id,
            m.mention_user_ids,
            m.attachment_path,
            m.attachment_name,
            m.attachment_mime,
            m.attachment_size,
            u.name AS sender_name,
            u.email AS sender_email,
            (SELECT COUNT(*)::int
             FROM message_reads mr
             WHERE mr.message_id = m.id) AS read_count,
            (SELECT EXISTS(
               SELECT 1
               FROM message_reads mr
               WHERE mr.message_id = m.id AND mr.user_id = $2
             )) AS read_by_me
     FROM event_messages m
     LEFT JOIN users u ON u.id = m.user_id
     WHERE m.id = $1
     `,
    [messageId, currentUserId]
  );

  if (!result.rows[0]) return null;
  return sanitizeMessageRow(result.rows[0], currentUserId);
};

const createEventMessage = async (db, { eventId, userId, message, parentMessageId = null, file = null }) => {
  const mentionUserIds = await parseMentionUserIds(db, eventId, message);
  const result = await db(
    `INSERT INTO event_messages (
      event_id,
      user_id,
      message,
      parent_message_id,
      mention_user_ids,
      attachment_path,
      attachment_name,
      attachment_mime,
      attachment_size
    )
    VALUES ($1, $2, $3, $4, $5::uuid[], $6, $7, $8, $9)
    RETURNING id`,
    [
      eventId,
      userId,
      String(message).trim(),
      parentMessageId || null,
      mentionUserIds,
      file?.path ? `/uploads/chat/${file.filename}` : null,
      file?.originalname || null,
      file?.mimetype || null,
      file?.size || null,
    ]
  );

  const messagePayload = await loadMessageById(db, result.rows[0].id, userId);
  return { messagePayload, mentionUserIds };
};

const loadEventTaskRows = async (db, eventId) => {
  const result = await db(
    `SELECT t.*,
            COALESCE(assignee_meta.assigned_to_ids, ARRAY[]::uuid[]) AS assigned_to_ids,
            COALESCE(assignee_meta.assignee_names, ARRAY[]::text[]) AS assignee_names,
            COALESCE(assignee_meta.assignees, '[]'::json) AS assignees,
            COALESCE(assignee_meta.assignee_names[1], assignee.name) AS assignee_name,
            COALESCE(assignee_meta.assignee_emails[1], assignee.email) AS assignee_email,
            creator.name AS created_by_name
     FROM tasks t
     LEFT JOIN LATERAL (
       SELECT ARRAY_AGG(ta.user_id ORDER BY u.name, u.id) AS assigned_to_ids,
              ARRAY_AGG(u.name ORDER BY u.name, u.id) AS assignee_names,
              ARRAY_AGG(u.email ORDER BY u.name, u.id) AS assignee_emails,
              JSON_AGG(JSON_BUILD_OBJECT('id', u.id, 'name', u.name, 'email', u.email) ORDER BY u.name, u.id) AS assignees
       FROM task_assignees ta
       JOIN users u ON u.id = ta.user_id
       WHERE ta.task_id = t.id
     ) assignee_meta ON TRUE
     LEFT JOIN users assignee ON assignee.id = t.assigned_to
     LEFT JOIN users creator ON creator.id = t.created_by
     WHERE t.event_id = $1
     ORDER BY
       CASE t.status
         WHEN 'pending' THEN 0
         WHEN 'in_progress' THEN 1
         ELSE 2
       END,
       t.due_date NULLS LAST,
       t.created_at DESC`,
    [eventId]
  );

  return result.rows.map(sanitizeTaskRow);
};

const loadEventMemberRows = async (db, eventId, currentUserId = null) => {
  const result = await db(
    `SELECT em.id,
            em.event_id,
            em.user_id,
            em.role,
            em.created_at,
            CASE WHEN e.created_by = em.user_id THEN TRUE ELSE FALSE END AS is_creator,
            u.name,
            u.email,
            u.role AS user_role
     FROM event_members em
     JOIN users u ON u.id = em.user_id
     JOIN events e ON e.id = em.event_id
     WHERE em.event_id = $1
     ORDER BY CASE WHEN e.created_by = em.user_id THEN 0 ELSE 1 END, em.created_at ASC, u.name ASC`,
    [eventId]
  );

  return result.rows.map((row) => sanitizeMemberRow(row, currentUserId));
};

const loadEventMessageRows = async (db, eventId, currentUserId = null) => {
  const result = await db(
    `SELECT m.id,
            m.event_id,
            m.user_id,
            m.message,
            m.created_at,
            m.updated_at,
            m.deleted_at,
            m.is_pinned,
            m.parent_message_id,
            m.mention_user_ids,
            m.attachment_path,
            m.attachment_name,
            m.attachment_mime,
            m.attachment_size,
            u.name AS sender_name,
            u.email AS sender_email,
            (SELECT COUNT(*)::int
             FROM message_reads mr
             WHERE mr.message_id = m.id) AS read_count,
            (SELECT EXISTS(
               SELECT 1
               FROM message_reads mr
               WHERE mr.message_id = m.id AND mr.user_id = $2
             )) AS read_by_me
     FROM event_messages m
     LEFT JOIN users u ON u.id = m.user_id
     WHERE m.event_id = $1 AND m.deleted_at IS NULL
     ORDER BY m.is_pinned DESC, m.created_at ASC`,
    [eventId, currentUserId]
  );

  return result.rows.map((row) => sanitizeMessageRow(row, currentUserId));
};

const buildTaskBuckets = (tasks) => ({
  todo: tasks.filter((task) => task.status === 'pending'),
  inProgress: tasks.filter((task) => task.status === 'in_progress'),
  done: tasks.filter((task) => task.status === 'done'),
});

const buildEventActivity = async (db, eventId) => {
  const result = await db(
    `WITH task_activity AS (
       SELECT 'task' AS activity_type,
              t.updated_at AS created_at,
              t.title AS title,
              t.status AS status,
              COALESCE(primary_assignee.name, assignee.name, 'Unassigned') AS actor_name,
              e.name AS event_name
       FROM tasks t
       JOIN events e ON e.id = t.event_id
       LEFT JOIN LATERAL (
         SELECT u.name
         FROM task_assignees ta
         JOIN users u ON u.id = ta.user_id
         WHERE ta.task_id = t.id
         ORDER BY u.name, u.id
         LIMIT 1
       ) primary_assignee ON TRUE
       LEFT JOIN users assignee ON assignee.id = t.assigned_to
       WHERE t.event_id = $1
     ), message_activity AS (
       SELECT 'message' AS activity_type,
              m.created_at AS created_at,
              m.message AS title,
              NULL::text AS status,
              COALESCE(sender.name, 'Team member') AS actor_name,
              e.name AS event_name
       FROM event_messages m
       JOIN events e ON e.id = m.event_id
       LEFT JOIN users sender ON sender.id = m.user_id
       WHERE m.event_id = $1 AND m.deleted_at IS NULL
     ), member_activity AS (
       SELECT 'member' AS activity_type,
              em.created_at AS created_at,
              COALESCE(member.name, 'Team member') AS title,
              NULL::text AS status,
              COALESCE(member.name, 'Team member') AS actor_name,
              e.name AS event_name
       FROM event_members em
       JOIN events e ON e.id = em.event_id
       LEFT JOIN users member ON member.id = em.user_id
       WHERE em.event_id = $1
     )
     SELECT *
     FROM (
       SELECT * FROM task_activity
       UNION ALL
       SELECT * FROM message_activity
       UNION ALL
       SELECT * FROM member_activity
     ) activity_feed
     ORDER BY created_at DESC
     LIMIT 12`,
    [eventId]
  );

  return result.rows.map((row) => {
    if (row.activity_type === 'task') {
      return buildActivityEntry({
        type: 'task',
        text: `${row.actor_name} updated task "${row.title}"`,
        createdAt: row.created_at,
        icon: '✅',
      });
    }

    if (row.activity_type === 'message') {
      return buildActivityEntry({
        type: 'message',
        text: `${row.actor_name} posted in ${row.event_name}`,
        createdAt: row.created_at,
        icon: '💬',
      });
    }

    return buildActivityEntry({
      type: 'member',
      text: `${row.actor_name} joined ${row.event_name}`,
      createdAt: row.created_at,
      icon: '👤',
    });
  });
};

const buildEventResponse = async (db, eventId, currentUserId) => {
  const eventResult = await db(
    `SELECT e.*,
            creator.name AS created_by_name,
            creator.email AS created_by_email
     FROM events e
     JOIN users creator ON creator.id = e.created_by
     LEFT JOIN event_members access ON access.event_id = e.id AND access.user_id = $2
     WHERE e.id = $1
       AND (e.created_by = $2 OR access.user_id IS NOT NULL)`,
    [eventId, currentUserId]
  );

  if (eventResult.rows.length === 0) {
    return null;
  }

  const eventRow = eventResult.rows[0];
  const [taskRows, memberRows, messageRows, activityRows] = await Promise.all([
    loadEventTaskRows(db, eventId),
    loadEventMemberRows(db, eventId, currentUserId),
    loadEventMessageRows(db, eventId, currentUserId),
    buildEventActivity(db, eventId),
  ]);

  const completedTasks = taskRows.filter((task) => task.status === 'done').length;
  const overdueTasks = taskRows.filter((task) => {
    if (task.status === 'done' || !task.due_date) return false;
    return new Date(task.due_date).getTime() < Date.now();
  }).length;
  const dueSoonTasks = taskRows.filter((task) => {
    if (task.status === 'done' || !task.due_date) return false;
    const dueTime = new Date(task.due_date).getTime();
    return dueTime >= Date.now() && dueTime <= Date.now() + 48 * 60 * 60 * 1000;
  }).length;
  const totalTasks = taskRows.length;
  const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
  const status = computeEventStatus({
    eventDate: eventRow.date,
    overdueTasks,
    dueSoonTasks,
    completionRate,
  });

  return {
    ...sanitizeEventRow(eventRow, {
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      overdue_tasks: overdueTasks,
      due_soon_tasks: dueSoonTasks,
      member_count: memberRows.length,
    }),
    created_by_name: eventRow.created_by_name,
    created_by_email: eventRow.created_by_email,
    status,
    summary: {
      task_total: totalTasks,
      task_done: completedTasks,
      task_overdue: overdueTasks,
      task_due_soon: dueSoonTasks,
      completion_rate: Math.round(completionRate * 100),
      member_count: memberRows.length,
      days_left: eventRow.date ? Math.ceil((new Date(eventRow.date).getTime() - Date.now()) / 86400000) : null,
    },
    tasks: buildTaskBuckets(taskRows),
    members: memberRows,
    messages: messageRows,
    activity: activityRows,
    all_tasks: taskRows,
  };
};

// POST /api/events
const createEvent = async (req, res, next) => {
  try {
    const { name, description, date, venue, type, members = [] } = req.body;
    const createdBy = req.user.id;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Event name is required.' });
    }

    const userPlan = await getUserPlanRecord(query, createdBy);
    const planLimits = getPlanLimits(userPlan);

    if (planLimits.eventLimit !== null) {
      const createdCountResult = await query(
        `SELECT COUNT(*)::int AS total
         FROM events
         WHERE created_by = $1`,
        [createdBy]
      );
      const createdCount = createdCountResult.rows[0]?.total || 0;
      if (createdCount >= planLimits.eventLimit) {
        return res.status(403).json({
          success: false,
          message: buildEventLimitMessage(userPlan, planLimits.eventLimit),
          code: 'PLAN_EVENT_LIMIT_REACHED',
        });
      }
    }

    const result = await withTransaction(async (client) => {
      const eventResult = await client.query(
        `INSERT INTO events (name, description, date, venue, type, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [name.trim(), description || null, date || null, venue || null, type || null, createdBy]
      );

      const event = eventResult.rows[0];

      // Always add the creator as Organizer
      await client.query(
        `INSERT INTO event_members (event_id, user_id, role)
         VALUES ($1, $2, 'Organizer')
         ON CONFLICT (event_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
        [event.id, createdBy]
      );

      // Fetch creator's name for invite notification body
      const creatorResult = await client.query('SELECT name FROM users WHERE id = $1', [createdBy]);
      const creatorName = creatorResult.rows[0]?.name || 'A teammate';

      const invitedMembers = [];
      const skippedMembers = [];
      const processedMemberIds = new Set([createdBy]);

      if (Array.isArray(members)) {
        for (const member of members) {
          if (!member) continue;

          const role = VALID_MEMBER_ROLES.has(member.role) ? member.role : 'Member';
          let invitedUserId = null;
          let invitedEmail = null;

          if (member.user_id && isUuid(member.user_id)) {
            invitedUserId = member.user_id;
          } else if (member.email) {
            invitedEmail = String(member.email).trim().toLowerCase();
            const userLookup = await client.query('SELECT id FROM users WHERE LOWER(email) = $1', [invitedEmail]);
            invitedUserId = userLookup.rows[0]?.id || null;
          }

          if (!invitedUserId) {
            skippedMembers.push({ email: member.email || null, role, reason: 'user_not_found' });
            continue;
          }

          if (processedMemberIds.has(invitedUserId)) {
            continue;
          }

          // Remove any stale pending invite for this user + event before inserting a fresh one
          await client.query(
            `DELETE FROM notifications
             WHERE user_id = $1 AND type = 'event_invite' AND related_event_id = $2`,
            [invitedUserId, event.id]
          );

          // Send an invite notification — user must Accept to be added to the event
          await client.query(
            `INSERT INTO notifications (user_id, type, title, body, related_event_id)
             VALUES ($1, 'event_invite', $2, $3, $4)`,
            [
              invitedUserId,
              `You were invited to ${event.name}`,
              `${creatorName} invited you to join "${event.name}". Open your notifications to accept or decline.`,
              event.id,
            ]
          );

          processedMemberIds.add(invitedUserId);
          invitedMembers.push({ user_id: invitedUserId, email: invitedEmail || member.email || null, role });
        }
      }

      return { event, invitedMembers, skippedMembers };
    });

    const createdEvent = await buildEventResponse(query, result.event.id, createdBy);

    return res.status(201).json({
      success: true,
      event: createdEvent || result.event,
      invited_members: result.invitedMembers,
      skipped_members: result.skippedMembers,
    });
  } catch (err) {
    if (err?.code === 'PLAN_MEMBER_LIMIT_REACHED') {
      return res.status(403).json({ success: false, message: err.message, code: err.code });
    }
    next(err);
  }
};


// GET /api/events
const getEvents = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await query(
      `WITH accessible_events AS (
         SELECT DISTINCT e.id,
                         e.name,
                         e.description,
                         e.date,
                         e.venue,
                         e.type,
                         e.created_by,
                         e.created_at,
                         access.role AS member_role
         FROM events e
         JOIN event_members access ON access.event_id = e.id AND access.user_id = $1
       ), member_stats AS (
         SELECT event_id, COUNT(*)::int AS member_count
         FROM event_members
         GROUP BY event_id
       ), task_stats AS (
         SELECT event_id,
                COUNT(*)::int AS total_tasks,
                COUNT(*) FILTER (WHERE status = 'done')::int AS completed_tasks,
                COUNT(*) FILTER (WHERE status <> 'done' AND due_date < NOW())::int AS overdue_tasks,
                COUNT(*) FILTER (WHERE status <> 'done' AND due_date BETWEEN NOW() AND NOW() + INTERVAL '48 hours')::int AS due_soon_tasks,
                MIN(due_date) AS next_deadline
         FROM tasks
         GROUP BY event_id
       )
       SELECT ae.*,
              COALESCE(member_stats.member_count, 0) AS member_count,
              COALESCE(task_stats.total_tasks, 0) AS total_tasks,
              COALESCE(task_stats.completed_tasks, 0) AS completed_tasks,
              COALESCE(task_stats.overdue_tasks, 0) AS overdue_tasks,
              COALESCE(task_stats.due_soon_tasks, 0) AS due_soon_tasks,
              task_stats.next_deadline
       FROM accessible_events ae
       LEFT JOIN member_stats ON member_stats.event_id = ae.id
       LEFT JOIN task_stats ON task_stats.event_id = ae.id
       ORDER BY ae.created_at DESC`,
      [userId]
    );

    const events = result.rows.map((row) =>
      sanitizeEventRow(row, {
        member_count: row.member_count,
        total_tasks: row.total_tasks,
        completed_tasks: row.completed_tasks,
        overdue_tasks: row.overdue_tasks,
        due_soon_tasks: row.due_soon_tasks,
      })
    );

    return res.json({ success: true, events });
  } catch (err) {
    next(err);
  }
};

// GET /api/events/:id
const getEventById = async (req, res, next) => {
  try {
    const eventId = req.params.id;
    const event = await buildEventResponse(query, eventId, req.user.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    return res.json({ success: true, event });
  } catch (err) {
    next(err);
  }
};

// PUT /api/events/:id
const updateEvent = async (req, res, next) => {
  try {
    const eventId = req.params.id;
    const canEdit = await canManageEvent(query, req.user.id, eventId);
    if (!canEdit) {
      return res.status(403).json({ success: false, message: 'You do not have permission to update this event.' });
    }

    const { name, description, date, venue, type } = req.body;
    const eventResult = await query(
      `UPDATE events
       SET name = COALESCE($1, name),
           description = $2,
           date = $3,
           venue = $4,
           type = $5
       WHERE id = $6
       RETURNING *`,
      [name ? String(name).trim() : null, description ?? null, date ?? null, venue ?? null, type ?? null, eventId]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const event = await buildEventResponse(query, eventId, req.user.id);
    return res.json({ success: true, event });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/events/:id
const deleteEvent = async (req, res, next) => {
  try {
    const eventId = req.params.id;
    const canEdit = await canManageEvent(query, req.user.id, eventId);
    if (!canEdit) {
      return res.status(403).json({ success: false, message: 'You do not have permission to delete this event.' });
    }

    const result = await query('DELETE FROM events WHERE id = $1 RETURNING id', [eventId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    return res.json({ success: true, message: 'Event deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

// GET /api/events/:id/members
const getEventMembers = async (req, res, next) => {
  try {
    const eventId = req.params.id;
    const allowed = await hasEventAccess(query, req.user.id, eventId);
    if (!allowed) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const members = await loadEventMemberRows(query, eventId, req.user.id);
    return res.json({ success: true, members });
  } catch (err) {
    next(err);
  }
};

// POST /api/events/:id/invite
const inviteMember = async (req, res, next) => {
  try {
    const eventId = req.params.id;
    const canEdit = await canManageEvent(query, req.user.id, eventId);
    if (!canEdit) {
      return res.status(403).json({ success: false, message: 'You do not have permission to invite members.' });
    }

    const { user_id, email, role = 'Member' } = req.body;
    if (!VALID_MEMBER_ROLES.has(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }

    let invitedUserId = null;
    let invitedEmail = null;

    if (user_id && isUuid(user_id)) {
      invitedUserId = user_id;
    } else if (email) {
      invitedEmail = String(email).trim().toLowerCase();
      const userLookup = await query('SELECT id FROM users WHERE LOWER(email) = $1', [invitedEmail]);
      invitedUserId = userLookup.rows[0]?.id || null;
    }

    if (!invitedUserId) {
      return res.status(404).json({ success: false, message: 'No matching user was found to invite.' });
    }

    const eventPlanResult = await query(
      `SELECT e.created_by,
              COALESCE(owner.plan, 'free') AS owner_plan,
              (SELECT COUNT(*)::int FROM event_members em WHERE em.event_id = e.id) AS member_count,
              EXISTS(
                SELECT 1
                FROM event_members em2
                WHERE em2.event_id = e.id AND em2.user_id = $2
              ) AS already_member
       FROM events e
       JOIN users owner ON owner.id = e.created_by
       WHERE e.id = $1`,
      [eventId, invitedUserId]
    );

    if (eventPlanResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const eventPlanRow = eventPlanResult.rows[0];
    if (eventPlanRow.already_member) {
      return res.status(409).json({ success: false, message: 'That user is already a member of this event.' });
    }

    const ownerPlan = normalizePlan(eventPlanRow.owner_plan);
    const ownerPlanLimits = getPlanLimits(ownerPlan);

    if (ownerPlanLimits.memberLimit !== null && eventPlanRow.member_count >= ownerPlanLimits.memberLimit) {
      return res.status(403).json({
        success: false,
        message: buildMemberLimitMessage(ownerPlan, ownerPlanLimits.memberLimit),
        code: 'PLAN_MEMBER_LIMIT_REACHED',
      });
    }

    await query(
      `DELETE FROM notifications
       WHERE user_id = $1
         AND type = 'event_invite'
         AND related_event_id = $2`,
      [invitedUserId, eventId]
    );

    const eventRowResult = await query(
      `SELECT e.name AS event_name,
              creator.name AS creator_name
       FROM events e
       JOIN users creator ON creator.id = e.created_by
       WHERE e.id = $1`,
      [eventId]
    );

    const eventRow = eventRowResult.rows[0];

    await query(
      `INSERT INTO notifications (user_id, type, title, body, related_event_id)
       VALUES ($1, 'event_invite', $2, $3, $4)`,
      [
        invitedUserId,
        `You were invited to ${eventRow?.event_name || 'an event'}`,
        `${eventRow?.creator_name || 'A teammate'} invited you to join ${eventRow?.event_name || 'an event'}. Open your notifications to accept or reject the invite.`,
        eventId,
      ]
    );

    return res.json({
      success: true,
      message: 'Event invitation sent successfully.',
      invite: {
        event_id: eventId,
        user_id: invitedUserId,
        email: invitedEmail,
        role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/events/:id/members/:memberId
const updateEventMember = async (req, res, next) => {
  try {
    const eventId = req.params.id;
    const memberId = req.params.memberId;
    const canEdit = await canManageEvent(query, req.user.id, eventId);
    if (!canEdit) {
      return res.status(403).json({ success: false, message: 'You do not have permission to update members.' });
    }

    const { role } = req.body;
    if (!VALID_MEMBER_ROLES.has(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }

    const creatorCheck = await query('SELECT created_by FROM events WHERE id = $1', [eventId]);
    if (creatorCheck.rows[0]?.created_by === memberId) {
      return res.status(400).json({ success: false, message: 'The event owner role cannot be changed.' });
    }

    const result = await query(
      `UPDATE event_members
       SET role = $1
       WHERE event_id = $2 AND user_id = $3
       RETURNING id, event_id, user_id, role, created_at`,
      [role, eventId, memberId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    return res.json({ success: true, member: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/events/:id/members/:memberId
const removeEventMember = async (req, res, next) => {
  try {
    const eventId = req.params.id;
    const memberId = req.params.memberId;
    const canEdit = await canManageEvent(query, req.user.id, eventId);
    if (!canEdit) {
      return res.status(403).json({ success: false, message: 'You do not have permission to remove members.' });
    }

    const creatorCheck = await query('SELECT created_by FROM events WHERE id = $1', [eventId]);
    if (creatorCheck.rows[0]?.created_by === memberId) {
      return res.status(400).json({ success: false, message: 'The event owner cannot be removed.' });
    }

    const result = await query('DELETE FROM event_members WHERE event_id = $1 AND user_id = $2 RETURNING id', [eventId, memberId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    return res.json({ success: true, message: 'Member removed successfully.' });
  } catch (err) {
    next(err);
  }
};

// GET /api/events/:id/messages
const getEventMessages = async (req, res, next) => {
  try {
    const eventId = req.params.id;
    const allowed = await hasEventAccess(query, req.user.id, eventId);
    if (!allowed) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const messages = await loadEventMessageRows(query, eventId, req.user.id);
    return res.json({ success: true, messages });
  } catch (err) {
    next(err);
  }
};

// POST /api/events/:id/messages
const sendEventMessage = async (req, res, next) => {
  try {
    const eventId = req.params.id;
    const allowed = await hasEventAccess(query, req.user.id, eventId);
    if (!allowed) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const { message, parent_message_id: parentMessageId } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }

    const { messagePayload, mentionUserIds } = await createEventMessage(query, {
      eventId,
      userId: req.user.id,
      message,
      parentMessageId: parentMessageId || null,
      file: req.file || null,
    });

    const io = getIo();
    if (io) {
      io.to(roomName(eventId)).emit('chat:newMessage', messagePayload);
      if (mentionUserIds.length > 0) {
        const mentionPayload = await getMentionPayload({ eventId, messagePayload, mentionUserIds });
        io.to(roomName(eventId)).emit('chat:mentionPing', mentionPayload);
      }
    }

    return res.status(201).json({ success: true, chat_message: messagePayload, mention_user_ids: mentionUserIds });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/events/:id/messages/:messageId/pin
const pinEventMessage = async (req, res, next) => {
  try {
    const eventId = req.params.id;
    const { messageId } = req.params;
    const canEdit = await canManageEvent(query, req.user.id, eventId);
    if (!canEdit) {
      return res.status(403).json({ success: false, message: 'You do not have permission to pin messages.' });
    }

    const result = await query(
      `UPDATE event_messages
       SET is_pinned = NOT is_pinned, updated_at = NOW()
       WHERE id = $1 AND event_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [messageId, eventId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }

    const messagePayload = await loadMessageById(query, messageId, req.user.id);
    const io = getIo();
    if (io) {
      io.to(roomName(eventId)).emit('chat:messagePinned', messagePayload);
    }
    return res.json({ success: true, chat_message: messagePayload });
  } catch (err) {
    next(err);
  }
};

// POST /api/events/:id/messages/read
const markMessagesAsRead = async (req, res, next) => {
  try {
    const eventId = req.params.id;
    const allowed = await hasEventAccess(query, req.user.id, eventId);
    if (!allowed) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const messageIds = Array.isArray(req.body?.message_ids) ? req.body.message_ids.filter(isUuid) : [];
    if (messageIds.length === 0) {
      return res.status(400).json({ success: false, message: 'message_ids must contain at least one valid id.' });
    }

    await query(
      `INSERT INTO message_reads (message_id, user_id)
       SELECT m.id, $2
       FROM event_messages m
       WHERE m.event_id = $1
         AND m.id = ANY($3::uuid[])
         AND m.deleted_at IS NULL
       ON CONFLICT (message_id, user_id) DO UPDATE SET read_at = NOW()`,
      [eventId, req.user.id, messageIds]
    );

    const io = getIo();
    if (io) {
      io.to(roomName(eventId)).emit('chat:messageRead', {
        event_id: eventId,
        message_ids: messageIds,
        user_id: req.user.id,
      });
    }

    return res.json({ success: true, message_ids: messageIds });
  } catch (err) {
    next(err);
  }
};

const createMessageViaSocket = async ({ eventId, userId, message, parentMessageId = null }) => {
  const allowed = await hasEventAccess(query, userId, eventId);
  if (!allowed) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }
  return createEventMessage(query, { eventId, userId, message, parentMessageId });
};

const togglePinnedViaSocket = async ({ eventId, userId, messageId }) => {
  const canEdit = await canManageEvent(query, userId, eventId);
  if (!canEdit) {
    const error = new Error('You do not have permission to pin messages.');
    error.statusCode = 403;
    throw error;
  }

  const result = await query(
    `UPDATE event_messages
     SET is_pinned = NOT is_pinned, updated_at = NOW()
     WHERE id = $1 AND event_id = $2 AND deleted_at IS NULL
     RETURNING id`,
    [messageId, eventId]
  );
  if (!result.rows[0]) return null;
  return loadMessageById(query, messageId, userId);
};

const markMessageReadsViaSocket = async ({ eventId, userId, messageIds = [] }) => {
  const safeMessageIds = messageIds.filter(isUuid);
  if (safeMessageIds.length === 0) return [];

  await query(
    `INSERT INTO message_reads (message_id, user_id)
     SELECT m.id, $2
     FROM event_messages m
     WHERE m.event_id = $1
       AND m.id = ANY($3::uuid[])
       AND m.deleted_at IS NULL
     ON CONFLICT (message_id, user_id) DO UPDATE SET read_at = NOW()`,
    [eventId, userId, safeMessageIds]
  );

  return safeMessageIds;
};

const getEventAccessForSocket = async ({ eventId, userId }) => {
  return hasEventAccess(query, userId, eventId);
};

const getEventRoleForSocket = async ({ eventId, userId }) => {
  return getEventRole(query, userId, eventId);
};

const getEventMessagesForSocket = async ({ eventId, userId }) => {
  return loadEventMessageRows(query, eventId, userId);
};

const getMessageByIdForSocket = async ({ messageId, userId }) => {
  return loadMessageById(query, messageId, userId);
};

const getMentionPayload = async ({ eventId, messagePayload, mentionUserIds = [] }) => {
  if (!Array.isArray(mentionUserIds) || mentionUserIds.length === 0) {
    return [];
  }
  const result = await query(
    `SELECT id, name
     FROM users
     WHERE id = ANY($1::uuid[])`,
    [mentionUserIds]
  );
  return result.rows.map((row) => ({
    event_id: eventId,
    message_id: messagePayload.id,
    target_user_id: row.id,
    target_name: row.name,
  }));
};

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getEventMembers,
  inviteMember,
  updateEventMember,
  removeEventMember,
  getEventMessages,
  sendEventMessage,
  pinEventMessage,
  markMessagesAsRead,
  createMessageViaSocket,
  togglePinnedViaSocket,
  markMessageReadsViaSocket,
  getEventAccessForSocket,
  getEventRoleForSocket,
  getEventMessagesForSocket,
  getMessageByIdForSocket,
  getMentionPayload,
};
