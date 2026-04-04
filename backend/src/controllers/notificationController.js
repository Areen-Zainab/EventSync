const { query } = require('../config/db');

// GET /api/notifications - Get all notifications for the logged-in user
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { type, is_read, limit = 50 } = req.query;

    const params = [userId];
    let whereClause = 'WHERE user_id = $1';

    if (type) {
      params.push(type);
      whereClause += ` AND type = $${params.length}`;
    }

    if (is_read !== undefined) {
      params.push(is_read === 'true');
      whereClause += ` AND is_read = $${params.length}`;
    }

    params.push(parseInt(limit, 10) || 50);

    const result = await query(
      `SELECT 
        n.id,
        n.user_id,
        n.type,
        n.title,
        n.body,
        n.related_task_id,
        n.related_event_id,
        n.is_read,
        n.created_at,
        t.title as task_title,
        e.name as event_name
       FROM notifications n
       LEFT JOIN tasks t ON t.id = n.related_task_id
       LEFT JOIN events e ON e.id = n.related_event_id
       ${whereClause}
       ORDER BY n.created_at DESC
       LIMIT $${params.length}`,
      params
    );

    return res.json({
      success: true,
      notifications: result.rows,
    });
  } catch (err) {
    return next(err);
  }
};

// GET /api/notifications/unread-count - Get count of unread notifications
const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT COUNT(*) as count
       FROM notifications
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );

    return res.json({
      success: true,
      unread_count: parseInt(result.rows[0].count, 10),
    });
  } catch (err) {
    return next(err);
  }
};

// PATCH /api/notifications/:id/read - Mark a notification as read
const markAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    return res.json({
      success: true,
      notification: result.rows[0],
    });
  } catch (err) {
    return next(err);
  }
};

// PATCH /api/notifications/mark-all-read - Mark all notifications as read
const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;

    await query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );

    return res.json({
      success: true,
      message: 'All notifications marked as read.',
    });
  } catch (err) {
    return next(err);
  }
};

// DELETE /api/notifications/:id - Delete a notification
const deleteNotification = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await query(
      `DELETE FROM notifications
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    return res.json({
      success: true,
      message: 'Notification deleted successfully.',
    });
  } catch (err) {
    return next(err);
  }
};

// GET /api/notifications/preferences - Get user notification preferences
const getPreferences = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT * FROM user_settings WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Create default preferences if they don't exist
      const created = await query(
        `INSERT INTO user_settings (user_id, task_reminders, ai_alerts, team_updates, quiet_hours)
         VALUES ($1, TRUE, TRUE, FALSE, TRUE)
         RETURNING *`,
        [userId]
      );
      return res.json({ success: true, preferences: created.rows[0] });
    }

    return res.json({
      success: true,
      preferences: result.rows[0],
    });
  } catch (err) {
    return next(err);
  }
};

// PUT /api/notifications/preferences - Update user notification preferences
const updatePreferences = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { task_reminders, ai_alerts, team_updates, quiet_hours } = req.body;

    // Ensure user_settings record exists
    await query(
      `INSERT INTO user_settings (user_id, task_reminders, ai_alerts, team_updates, quiet_hours)
       VALUES ($1, TRUE, TRUE, FALSE, TRUE)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );

    const result = await query(
      `UPDATE user_settings
       SET task_reminders = COALESCE($2, task_reminders),
           ai_alerts = COALESCE($3, ai_alerts),
           team_updates = COALESCE($4, team_updates),
           quiet_hours = COALESCE($5, quiet_hours),
           updated_at = NOW()
       WHERE user_id = $1
       RETURNING *`,
      [userId, task_reminders, ai_alerts, team_updates, quiet_hours]
    );

    return res.json({
      success: true,
      preferences: result.rows[0],
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getPreferences,
  updatePreferences,
};
