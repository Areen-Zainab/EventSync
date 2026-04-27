const { query } = require('../config/db');
const { getPlanLimits, normalizePlan } = require('../utils/planLimits');
const {
  sanitizeEventRow,
  sanitizeTaskRow,
  buildActivityEntry,
  computeEventStatus,
} = require('../utils/eventHelpers');

const loadAccessibleEvents = async (userId) => {
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
              COUNT(*) FILTER (WHERE status <> 'done' AND due_date BETWEEN NOW() AND NOW() + INTERVAL '48 hours')::int AS due_soon_tasks
       FROM tasks
       GROUP BY event_id
     )
     SELECT ae.*,
            COALESCE(member_stats.member_count, 0) AS member_count,
            COALESCE(task_stats.total_tasks, 0) AS total_tasks,
            COALESCE(task_stats.completed_tasks, 0) AS completed_tasks,
            COALESCE(task_stats.overdue_tasks, 0) AS overdue_tasks,
            COALESCE(task_stats.due_soon_tasks, 0) AS due_soon_tasks
     FROM accessible_events ae
     LEFT JOIN member_stats ON member_stats.event_id = ae.id
     LEFT JOIN task_stats ON task_stats.event_id = ae.id
     ORDER BY ae.created_at DESC`,
    [userId]
  );

  return result.rows.map((row) => sanitizeEventRow(row, row));
};

const getDashboardOverview = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [userResult, createdEventsResult, events, todayTasksResult, deadlinesResult, overdueCountResult, teamCountResult, activityResult] = await Promise.all([
        query("SELECT id, name, email, role, COALESCE(plan, 'free') AS plan FROM users WHERE id = $1", [userId]),
      query('SELECT COUNT(*)::int AS total FROM events WHERE created_by = $1', [userId]),
      loadAccessibleEvents(userId),
      query(
        `SELECT t.*,
                COALESCE(assignee_meta.assigned_to_ids, ARRAY[]::uuid[]) AS assigned_to_ids,
                COALESCE(assignee_meta.assignee_names, ARRAY[]::text[]) AS assignee_names,
                COALESCE(assignee_meta.assignees, '[]'::json) AS assignees,
                COALESCE(assignee_meta.assignee_names[1], assignee.name) AS assignee_name,
                COALESCE(assignee_meta.assignee_emails[1], assignee.email) AS assignee_email,
                e.name AS event_name
         FROM tasks t
         JOIN events e ON e.id = t.event_id
         JOIN event_members access ON access.event_id = e.id AND access.user_id = $1
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
         WHERE t.status <> 'done'
           AND t.due_date IS NOT NULL
           AND t.due_date::date = CURRENT_DATE
         ORDER BY CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, t.due_date ASC
         LIMIT 3`,
        [userId]
      ),
      query(
        `SELECT t.*,
                COALESCE(assignee_meta.assigned_to_ids, ARRAY[]::uuid[]) AS assigned_to_ids,
                COALESCE(assignee_meta.assignee_names, ARRAY[]::text[]) AS assignee_names,
                COALESCE(assignee_meta.assignees, '[]'::json) AS assignees,
                COALESCE(assignee_meta.assignee_names[1], assignee.name) AS assignee_name,
                COALESCE(assignee_meta.assignee_emails[1], assignee.email) AS assignee_email,
                e.name AS event_name
         FROM tasks t
         JOIN events e ON e.id = t.event_id
         JOIN event_members access ON access.event_id = e.id AND access.user_id = $1
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
         WHERE t.status <> 'done'
           AND t.due_date IS NOT NULL
           AND t.due_date BETWEEN NOW() AND NOW() + INTERVAL '48 hours'
         ORDER BY t.due_date ASC
         LIMIT 5`,
        [userId]
      ),
      query(
        `SELECT COUNT(*)::int AS overdue_tasks
         FROM tasks t
         JOIN events e ON e.id = t.event_id
         JOIN event_members access ON access.event_id = e.id AND access.user_id = $1
         WHERE t.status <> 'done'
           AND t.due_date IS NOT NULL
           AND t.due_date < NOW()`,
        [userId]
      ),
      query(
        `SELECT COUNT(DISTINCT em.user_id)::int AS team_members
         FROM event_members em
         JOIN events e ON e.id = em.event_id
         JOIN event_members access ON access.event_id = e.id AND access.user_id = $1`,
        [userId]
      ),
      query(
        `WITH activity_feed AS (
           SELECT 'task' AS activity_type,
                  t.updated_at AS created_at,
                  t.title AS title,
                COALESCE(primary_assignee.name, assignee.name) AS actor_name,
                  e.name AS event_name
           FROM tasks t
           JOIN events e ON e.id = t.event_id
           JOIN event_members access ON access.event_id = e.id AND access.user_id = $1
              LEFT JOIN LATERAL (
                SELECT u.name
                FROM task_assignees ta
                JOIN users u ON u.id = ta.user_id
                WHERE ta.task_id = t.id
                ORDER BY u.name, u.id
                LIMIT 1
              ) primary_assignee ON TRUE
           LEFT JOIN users assignee ON assignee.id = t.assigned_to
           WHERE t.updated_at >= NOW() - INTERVAL '14 days'

           UNION ALL

           SELECT 'message' AS activity_type,
                  m.created_at AS created_at,
                  m.message AS title,
                  sender.name AS actor_name,
                  e.name AS event_name
           FROM event_messages m
           JOIN events e ON e.id = m.event_id
           JOIN event_members access ON access.event_id = e.id AND access.user_id = $1
           LEFT JOIN users sender ON sender.id = m.user_id
           WHERE m.deleted_at IS NULL
             AND m.created_at >= NOW() - INTERVAL '14 days'

           UNION ALL

           SELECT 'member' AS activity_type,
                  em.created_at AS created_at,
                  member.name AS title,
                  member.name AS actor_name,
                  e.name AS event_name
           FROM event_members em
           JOIN events e ON e.id = em.event_id
           JOIN event_members access ON access.event_id = e.id AND access.user_id = $1
           LEFT JOIN users member ON member.id = em.user_id
           WHERE em.created_at >= NOW() - INTERVAL '14 days'
         )
         SELECT *
         FROM activity_feed
         ORDER BY created_at DESC
         LIMIT 8`,
        [userId]
      ),
    ]);

    const activeEvents = events.length;
    const overdueEvents = events.filter((event) => event.status === 'overdue').length;
    const todayTasks = todayTasksResult.rows.map(sanitizeTaskRow);
    const deadlines = deadlinesResult.rows.map(sanitizeTaskRow);
    const activity = activityResult.rows.map((row) => {
      if (row.activity_type === 'task') {
        return buildActivityEntry({
          type: 'task',
          text: `${row.actor_name || 'A team member'} updated task "${row.title}" in ${row.event_name}`,
          createdAt: row.created_at,
          icon: '✅',
        });
      }

      if (row.activity_type === 'message') {
        return buildActivityEntry({
          type: 'message',
          text: `${row.actor_name || 'A team member'} posted in ${row.event_name}`,
          createdAt: row.created_at,
          icon: '💬',
        });
      }

      return buildActivityEntry({
        type: 'member',
        text: `${row.actor_name || 'A team member'} joined ${row.event_name}`,
        createdAt: row.created_at,
        icon: '👤',
      });
    });

    const user = userResult.rows[0] || null;
    const normalizedPlan = normalizePlan(user?.plan || 'free');
    const planLimits = getPlanLimits(normalizedPlan);
    const eventsCreated = createdEventsResult.rows[0]?.total || 0;
    const eventsLeft = planLimits.eventLimit === null ? null : Math.max(0, planLimits.eventLimit - eventsCreated);
    const stats = {
      active_events: activeEvents,
      overdue_events: overdueEvents,
      tasks_today: todayTasks.length,
      overdue_tasks: overdueCountResult.rows[0]?.overdue_tasks || 0,
      team_members: teamCountResult.rows[0]?.team_members || 0,
    };

    return res.json({
      success: true,
      dashboard: {
        user,
        plan: {
          name: normalizedPlan,
          event_limit: planLimits.eventLimit,
          member_limit: planLimits.memberLimit,
          events_created: eventsCreated,
          events_left: eventsLeft,
        },
        stats,
        events,
        today_tasks: todayTasks,
        deadlines,
        activity,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboardOverview,
};
