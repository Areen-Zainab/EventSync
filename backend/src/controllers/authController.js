const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const SALT_ROUNDS = 10;

const DEFAULT_SETTINGS = {
  task_reminders: true,
  ai_alerts: true,
  team_updates: false,
  quiet_hours: true,
};

const generateToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// POST /api/auth/signup
const signup = async (req, res, next) => {
  try {
    const { name, email, password, role, privacy_consent } = req.body;

    // Validation
    if (!name || !email || !password || !role || privacy_consent === undefined) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    if (!privacy_consent) {
      return res.status(400).json({ success: false, message: 'Privacy consent is required.' });
    }
    if (!['Organizer', 'Member'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be Organizer or Member.' });
    }

    // Check duplicate email
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await query(
      `INSERT INTO users (name, email, password_hash, role, privacy_consent)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, created_at`,
      [name, email, password_hash, role, privacy_consent]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    res.status(201).json({ success: true, token, user });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

const getCurrentUser = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.email, u.role, u.privacy_consent, u.created_at,
              COALESCE(s.task_reminders, TRUE) AS task_reminders,
              COALESCE(s.ai_alerts, TRUE) AS ai_alerts,
              COALESCE(s.team_updates, FALSE) AS team_updates,
              COALESCE(s.quiet_hours, TRUE) AS quiet_hours
       FROM users u
       LEFT JOIN user_settings s ON s.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    const user = result.rows[0];
    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        privacy_consent: user.privacy_consent,
        created_at: user.created_at,
      },
      settings: {
        taskReminders: user.task_reminders,
        aiAlerts: user.ai_alerts,
        teamUpdates: user.team_updates,
        quietHours: user.quiet_hours,
      },
    });
  } catch (err) {
    next(err);
  }
};

const updateCurrentUser = async (req, res, next) => {
  try {
    const { name, email, settings } = req.body;

    const existing = await query('SELECT id, email FROM users WHERE id = $1', [req.user.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    if (email && email.trim().toLowerCase() !== existing.rows[0].email.toLowerCase()) {
      const duplicate = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id <> $2', [email.trim(), req.user.id]);
      if (duplicate.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Email already registered.' });
      }
    }

    const updateResult = await query(
      `UPDATE users
       SET name = COALESCE(NULLIF($1, ''), name),
           email = COALESCE(NULLIF($2, ''), email)
       WHERE id = $3
       RETURNING id, name, email, role, privacy_consent, created_at`,
      [name || null, email || null, req.user.id]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    let savedSettings = null;
    if (settings && typeof settings === 'object') {
      const taskReminders = settings.taskReminders ?? DEFAULT_SETTINGS.task_reminders;
      const aiAlerts = settings.aiAlerts ?? DEFAULT_SETTINGS.ai_alerts;
      const teamUpdates = settings.teamUpdates ?? DEFAULT_SETTINGS.team_updates;
      const quietHours = settings.quietHours ?? DEFAULT_SETTINGS.quiet_hours;

      const settingsResult = await query(
        `INSERT INTO user_settings (user_id, task_reminders, ai_alerts, team_updates, quiet_hours, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET task_reminders = EXCLUDED.task_reminders,
                       ai_alerts = EXCLUDED.ai_alerts,
                       team_updates = EXCLUDED.team_updates,
                       quiet_hours = EXCLUDED.quiet_hours,
                       updated_at = NOW()
         RETURNING task_reminders, ai_alerts, team_updates, quiet_hours`,
        [req.user.id, taskReminders, aiAlerts, teamUpdates, quietHours]
      );

      savedSettings = settingsResult.rows[0];
    }

    const user = updateResult.rows[0];
    return res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, privacy_consent: user.privacy_consent, created_at: user.created_at },
      settings: savedSettings
        ? {
            taskReminders: savedSettings.task_reminders,
            aiAlerts: savedSettings.ai_alerts,
            teamUpdates: savedSettings.team_updates,
            quietHours: savedSettings.quiet_hours,
          }
        : undefined,
    });
  } catch (err) {
    next(err);
  }
};

const deleteCurrentUser = async (req, res, next) => {
  try {
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    return res.json({ success: true, message: 'Account deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { signup, login, getCurrentUser, updateCurrentUser, deleteCurrentUser };
