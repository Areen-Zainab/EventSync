const { query } = require('../config/db');
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

const loadEventTaskRows = async (db, eventId) => {
  const result = await db(
    `SELECT t.*,
            assignee.name AS assignee_name,
            assignee.email AS assignee_email,
            creator.name AS created_by_name
     FROM tasks t
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
            u.name AS sender_name,
            u.email AS sender_email
     FROM event_messages m
     LEFT JOIN users u ON u.id = m.user_id
     WHERE m.event_id = $1 AND m.deleted_at IS NULL
     ORDER BY m.is_pinned DESC, m.created_at ASC`,
    [eventId]
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
              COALESCE(assignee.name, 'Unassigned') AS actor_name,
              e.name AS event_name
       FROM tasks t
       JOIN events e ON e.id = t.event_id
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

    const result = await withTransaction(async (client) => {
      const eventResult = await client.query(
        `INSERT INTO events (name, description, date, venue, type, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [name.trim(), description || null, date || null, venue || null, type || null, createdBy]
      );

      const event = eventResult.rows[0];
      await client.query(
        `INSERT INTO event_members (event_id, user_id, role)
         VALUES ($1, $2, 'Organizer')
         ON CONFLICT (event_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
        [event.id, createdBy]
      );

      const invitedMembers = [];
      const skippedMembers = [];

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
            skippedMembers.push({ email: member.email || null, role });
            continue;
          }

          await client.query(
            `INSERT INTO event_members (event_id, user_id, role)
             VALUES ($1, $2, $3)
             ON CONFLICT (event_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
            [event.id, invitedUserId, role]
          );

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

    const memberResult = await query(
      `INSERT INTO event_members (event_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (event_id, user_id) DO UPDATE SET role = EXCLUDED.role
       RETURNING id, event_id, user_id, role, created_at`,
      [eventId, invitedUserId, role]
    );

    return res.json({
      success: true,
      message: 'Member invited successfully.',
      member: {
        ...memberResult.rows[0],
        email: invitedEmail,
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

    const { message } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }

    const result = await query(
      `INSERT INTO event_messages (event_id, user_id, message)
       VALUES ($1, $2, $3)
       RETURNING id, event_id, user_id, message, created_at, updated_at, is_pinned, deleted_at`,
      [eventId, req.user.id, String(message).trim()]
    );

    const senderResult = await query('SELECT name, email FROM users WHERE id = $1', [req.user.id]);
    const row = result.rows[0];
    const messagePayload = sanitizeMessageRow(
      {
        ...row,
        sender_name: senderResult.rows[0]?.name || null,
        sender_email: senderResult.rows[0]?.email || null,
      },
      req.user.id
    );

    return res.status(201).json({ success: true, chat_message: messagePayload });
  } catch (err) {
    next(err);
  }
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
};
