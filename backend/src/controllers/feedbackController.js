const { query } = require('../config/db');

const VALID_FEEDBACK = new Set(['liked', 'disliked', 'okay']);
const MAX_COMMENT_LENGTH = 2000;

const submitFeedback = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const rawFeedback = String(req.body.feedback || '').trim().toLowerCase();
    const commentInput = typeof req.body.comment === 'string' ? req.body.comment.trim() : '';

    if (!VALID_FEEDBACK.has(rawFeedback)) {
      return res.status(400).json({
        success: false,
        message: 'feedback must be one of liked, disliked, or okay.',
      });
    }

    if (commentInput.length > MAX_COMMENT_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `comment must be at most ${MAX_COMMENT_LENGTH} characters.`,
      });
    }

    const recentFeedback = await query(
      `SELECT id
       FROM feedback
       WHERE user_id = $1
         AND created_at >= NOW() - INTERVAL '24 hours'
       LIMIT 1`,
      [userId]
    );

    if (recentFeedback.rows.length > 0) {
      return res.status(429).json({
        success: false,
        message: 'Feedback already submitted in the last 24 hours.',
      });
    }

    const inserted = await query(
      `INSERT INTO feedback (user_id, feedback, comment, shown_at, created_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id, user_id, feedback, comment, shown_at, created_at`,
      [userId, rawFeedback, commentInput || null]
    );

    return res.status(201).json({
      success: true,
      feedback: inserted.rows[0],
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  submitFeedback,
};
