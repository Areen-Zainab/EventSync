const { query } = require('../config/db');
const posthog = require('../config/posthog');

// POST /api/events
const createEvent = async (req, res, next) => {
  try {
    const { name, description, date, venue, type } = req.body;
    const created_by = req.user.id;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Event name is required.' });
    }

    const result = await query(
      `INSERT INTO events (name, description, date, venue, type, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, description, date, venue, type, created_by]
    );

    const event = result.rows[0];

    // Auto-add creator as Organizer member
    await query(
      `INSERT INTO event_members (event_id, user_id, role) VALUES ($1, $2, 'Organizer')`,
      [event.id, created_by]
    );

    posthog.capture({
      distinctId: String(created_by),
      event: 'event_created',
      properties: { event_id: event.id, name: event.name, type: event.type, venue: event.venue },
    });

    res.status(201).json({ success: true, event });
  } catch (err) {
    next(err);
  }
};

// GET /api/events
const getEvents = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT e.*, em.role AS member_role
       FROM events e
       JOIN event_members em ON em.event_id = e.id
       WHERE em.user_id = $1
       ORDER BY e.created_at DESC`,
      [userId]
    );

    res.json({ success: true, events: result.rows });
  } catch (err) {
    next(err);
  }
};

// POST /api/events/:id/invite
const inviteMember = async (req, res, next) => {
  try {
    const { id: event_id } = req.params;
    const { user_id, role = 'Member' } = req.body;

    if (!user_id) {
      return res.status(400).json({ success: false, message: 'user_id is required.' });
    }

    await query(
      `INSERT INTO event_members (event_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (event_id, user_id) DO NOTHING`,
      [event_id, user_id, role]
    );

    posthog.capture({
      distinctId: String(req.user.id),
      event: 'event_member_invited',
      properties: { event_id, invited_user_id: user_id, role },
    });

    res.json({ success: true, message: 'Member invited.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { createEvent, getEvents, inviteMember };
