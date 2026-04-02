const { query } = require('../config/db');

const VALID_STATUSES = new Set(['pending', 'in_progress', 'done']);
const VALID_PRIORITIES = new Set(['low', 'medium', 'high']);

const sanitizeTask = (row) => ({
  id: row.id,
  event_id: row.event_id,
  created_by: row.created_by,
  title: row.title,
  description: row.description,
  assigned_to: row.assigned_to,
  status: row.status,
  due_date: row.due_date,
  priority: row.priority,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const ensureTaskAccess = async (userId, taskId) => {
  const result = await query(
    `SELECT DISTINCT t.*
     FROM tasks t
     LEFT JOIN event_members em ON em.event_id = t.event_id
     WHERE t.id = $1
       AND (t.created_by = $2 OR em.user_id = $2)`,
    [taskId, userId]
  );

  return result.rows[0] || null;
};

const ensureEventAccess = async (userId, eventId) => {
  const result = await query(
    `SELECT 1
     FROM event_members
     WHERE event_id = $1 AND user_id = $2`,
    [eventId, userId]
  );
  return result.rows.length > 0;
};

// POST /api/tasks
const createTask = async (req, res, next) => {
  try {
    const { event_id, title, description, assigned_to, status, due_date, priority } = req.body;
    const userId = req.user.id;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, message: 'title is required.' });
    }

    if (event_id) {
      const hasEventAccess = await ensureEventAccess(userId, event_id);
      if (!hasEventAccess) {
        return res.status(403).json({ success: false, message: 'You do not have access to this event.' });
      }
    }

    const normalizedStatus = status || 'pending';
    const normalizedPriority = priority || 'medium';

    if (!VALID_STATUSES.has(normalizedStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    if (!VALID_PRIORITIES.has(normalizedPriority)) {
      return res.status(400).json({ success: false, message: 'Invalid priority value.' });
    }

    const result = await query(
      `INSERT INTO tasks (event_id, created_by, title, description, assigned_to, status, due_date, priority, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [
        event_id || null,
        userId,
        String(title).trim(),
        description || null,
        assigned_to || null,
        normalizedStatus,
        due_date || null,
        normalizedPriority,
      ]
    );

    return res.status(201).json({ success: true, task: sanitizeTask(result.rows[0]) });
  } catch (err) {
    return next(err);
  }
};

// GET /api/tasks?event_id=<uuid>&status=pending
const getTasks = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { event_id, status } = req.query;

    if (status && !VALID_STATUSES.has(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status filter.' });
    }

    const params = [userId];
    let whereClause = 'WHERE (t.created_by = $1 OR em.user_id = $1)';

    if (event_id) {
      params.push(event_id);
      whereClause += ` AND t.event_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      whereClause += ` AND t.status = $${params.length}`;
    }

    const result = await query(
      `SELECT DISTINCT t.*
       FROM tasks t
       LEFT JOIN event_members em ON em.event_id = t.event_id
       ${whereClause}
       ORDER BY t.created_at DESC`,
      params
    );

    return res.json({
      success: true,
      tasks: result.rows.map(sanitizeTask),
    });
  } catch (err) {
    return next(err);
  }
};

// GET /api/tasks/:id
const getTaskById = async (req, res, next) => {
  try {
    const task = await ensureTaskAccess(req.user.id, req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    return res.json({ success: true, task: sanitizeTask(task) });
  } catch (err) {
    return next(err);
  }
};

// PUT /api/tasks/:id
const updateTask = async (req, res, next) => {
  try {
    const existingTask = await ensureTaskAccess(req.user.id, req.params.id);
    if (!existingTask) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const {
      title,
      description,
      assigned_to,
      status,
      due_date,
      priority,
      event_id,
    } = req.body;
    const shouldUpdateEventId = Object.prototype.hasOwnProperty.call(req.body, 'event_id');

    if (shouldUpdateEventId && event_id && event_id !== existingTask.event_id) {
      const hasEventAccess = await ensureEventAccess(req.user.id, event_id);
      if (!hasEventAccess) {
        return res.status(403).json({ success: false, message: 'You do not have access to this event.' });
      }
    }

    if (status && !VALID_STATUSES.has(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    if (priority && !VALID_PRIORITIES.has(priority)) {
      return res.status(400).json({ success: false, message: 'Invalid priority value.' });
    }

    const result = await query(
      `UPDATE tasks
       SET event_id = CASE WHEN $1 THEN $2 ELSE event_id END,
           title = COALESCE($3, title),
           description = $4,
           assigned_to = $5,
           status = COALESCE($6, status),
           due_date = $7,
           priority = COALESCE($8, priority),
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        shouldUpdateEventId,
        event_id || null,
        title ? String(title).trim() : null,
        description ?? existingTask.description,
        assigned_to ?? existingTask.assigned_to,
        status || null,
        due_date ?? existingTask.due_date,
        priority || null,
        req.params.id,
      ]
    );

    return res.json({ success: true, task: sanitizeTask(result.rows[0]) });
  } catch (err) {
    return next(err);
  }
};

// PATCH /api/tasks/:id/status
const updateTaskStatus = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const { status } = req.body;

    if (!status || !VALID_STATUSES.has(status)) {
      return res.status(400).json({ success: false, message: 'Valid status is required.' });
    }

    const existingTask = await ensureTaskAccess(req.user.id, taskId);
    if (!existingTask) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const result = await query(
      `UPDATE tasks
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, taskId]
    );

    return res.json({ success: true, task: sanitizeTask(result.rows[0]) });
  } catch (err) {
    return next(err);
  }
};

// DELETE /api/tasks/:id
const deleteTask = async (req, res, next) => {
  try {
    const existingTask = await ensureTaskAccess(req.user.id, req.params.id);
    if (!existingTask) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    await query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    return res.json({ success: true, message: 'Task deleted successfully.' });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
};
