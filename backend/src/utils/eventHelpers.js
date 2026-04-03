const db = require('../config/db');

const VALID_MEMBER_ROLES = new Set(['Organizer', 'Coordinator', 'Member']);

const withTransaction = async (callback) => {
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('[DATABASE_ERROR] Failed to rollback transaction:', rollbackError.message);
    }
    throw error;
  } finally {
    client.release();
  }
};

const toIsoDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const formatRelativeTime = (value) => {
  if (!value) return 'Just now';

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return 'Just now';

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const buildInitials = (name) => {
  if (!name) return 'U';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
};

const computeEventStatus = ({ eventDate, overdueTasks = 0, dueSoonTasks = 0, completionRate = 0 }) => {
  const eventTimestamp = eventDate ? new Date(eventDate).getTime() : null;
  if (eventTimestamp && !Number.isNaN(eventTimestamp) && eventTimestamp < Date.now()) {
    return 'overdue';
  }
  if (overdueTasks > 0) {
    return 'overdue';
  }
  if (dueSoonTasks > 0) {
    return 'at-risk';
  }
  if (completionRate > 0 && completionRate < 0.75) {
    return 'at-risk';
  }
  return 'on-track';
};

const sanitizeEventRow = (row, stats = {}) => {
  const totalTasks = Number(stats.total_tasks ?? stats.task_total ?? 0);
  const completedTasks = Number(stats.completed_tasks ?? stats.task_done ?? 0);
  const overdueTasks = Number(stats.overdue_tasks ?? 0);
  const dueSoonTasks = Number(stats.due_soon_tasks ?? 0);
  const memberCount = Number(stats.member_count ?? stats.members ?? 0);
  const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
  const daysLeft = row.date ? Math.ceil((new Date(row.date).getTime() - Date.now()) / 86400000) : null;

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    date: toIsoDate(row.date),
    venue: row.venue,
    type: row.type,
    created_by: row.created_by,
    created_at: toIsoDate(row.created_at),
    member_role: row.member_role || row.role || null,
    status: row.status || computeEventStatus({
      eventDate: row.date,
      overdueTasks,
      dueSoonTasks,
      completionRate,
    }),
    tasks: {
      total: totalTasks,
      done: completedTasks,
    },
    members: memberCount,
    metrics: {
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      overdue_tasks: overdueTasks,
      due_soon_tasks: dueSoonTasks,
      completion_rate: Math.round(completionRate * 100),
      days_left: Number.isFinite(daysLeft) ? daysLeft : null,
    },
  };
};

const sanitizeTaskRow = (row) => ({
  id: row.id,
  event_id: row.event_id,
  created_by: row.created_by,
  title: row.title,
  description: row.description,
  assigned_to: row.assigned_to,
  assignee_name: row.assignee_name || null,
  assignee_email: row.assignee_email || null,
  created_by_name: row.created_by_name || null,
  event_name: row.event_name || null,
  status: row.status,
  due_date: toIsoDate(row.due_date),
  priority: row.priority,
  created_at: toIsoDate(row.created_at),
  updated_at: toIsoDate(row.updated_at),
});

const sanitizeMemberRow = (row, currentUserId = null) => ({
  id: row.id,
  user_id: row.user_id,
  name: row.name,
  email: row.email,
  role: row.role,
  user_role: row.user_role || row.role,
  created_at: toIsoDate(row.created_at),
  is_creator: currentUserId ? row.user_id === currentUserId && row.is_creator : Boolean(row.is_creator),
  initials: buildInitials(row.name),
});

const sanitizeMessageRow = (row, currentUserId = null) => ({
  id: row.id,
  event_id: row.event_id,
  message: row.message,
  is_pinned: Boolean(row.is_pinned),
  sender: row.user_id
    ? {
        id: row.user_id,
        name: row.sender_name,
        email: row.sender_email || null,
      }
    : null,
  mine: currentUserId ? row.user_id === currentUserId : false,
  created_at: toIsoDate(row.created_at),
  updated_at: toIsoDate(row.updated_at),
  deleted_at: toIsoDate(row.deleted_at),
  time: formatRelativeTime(row.created_at),
});

const buildActivityEntry = ({ type, text, createdAt, icon }) => ({
  type,
  text,
  time: formatRelativeTime(createdAt),
  icon,
  created_at: toIsoDate(createdAt),
});

module.exports = {
  VALID_MEMBER_ROLES,
  withTransaction,
  formatRelativeTime,
  buildInitials,
  computeEventStatus,
  sanitizeEventRow,
  sanitizeTaskRow,
  sanitizeMemberRow,
  sanitizeMessageRow,
  buildActivityEntry,
};
