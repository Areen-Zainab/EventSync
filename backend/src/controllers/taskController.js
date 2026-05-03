const { query } = require('../config/db');
const { sendNotification } = require('../services/notificationService');
const posthog = require('../config/posthog');

const VALID_STATUSES = new Set(['pending', 'in_progress', 'done']);
const VALID_PRIORITIES = new Set(['low', 'medium', 'high']);

const normalizePriority = (value) => {
  if (!value) return 'medium';
  const normalized = String(value).trim().toLowerCase();
  if (VALID_PRIORITIES.has(normalized)) return normalized;
  if (normalized === 'urgent') return 'high';
  return 'medium';
};

const normalizeStatus = (value) => {
  if (!value) return 'pending';
  const normalized = String(value).trim().toLowerCase();
  if (VALID_STATUSES.has(normalized)) return normalized;
  if (normalized === 'todo') return 'pending';
  if (normalized === 'in progress') return 'in_progress';
  return 'pending';
};

const formatDateOnly = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeDueDate = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return formatDateOnly(parsed);
};

const isPastDueDate = (dateOnly) => {
  if (!dateOnly) return false;
  const today = formatDateOnly(new Date());
  return dateOnly < today;
};

const inferDueDateFromText = (text, now = new Date()) => {
  const value = String(text || '').toLowerCase();
  if (!value.trim()) return null;

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  if (/\b(by\s+)?(today|tonight|eod|end\s+of\s+day)\b/.test(value)) {
    return formatDateOnly(today);
  }

  if (/\b(by\s+)?tomorrow\b/.test(value)) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateOnly(tomorrow);
  }

  if (/\b(day\s+after\s+tomorrow)\b/.test(value)) {
    const next = new Date(today);
    next.setDate(next.getDate() + 2);
    return formatDateOnly(next);
  }

  if (/\b(by\s+)?next\s+week\b/.test(value)) {
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return formatDateOnly(nextWeek);
  }

  const weekdayMap = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };
  const weekdayMatch = value.match(/\bby\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (weekdayMatch) {
    const targetDay = weekdayMap[weekdayMatch[1]];
    const result = new Date(today);
    let delta = (targetDay - result.getDay() + 7) % 7;
    if (delta === 0) delta = 7;
    result.setDate(result.getDate() + delta);
    return formatDateOnly(result);
  }

  const explicitDate = normalizeDueDate(value);
  if (explicitDate) return explicitDate;

  return null;
};

const heuristicExtractTasks = (messages) => {
  const extracted = [];
  const seen = new Set();

  for (const message of messages) {
    const text = String(message?.message || '').trim();
    if (!text) continue;

    const lines = text.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const candidate = line
        .replace(/^[-*•]\s*/, '')
        .replace(/^\d+[.)]\s*/, '')
        .replace(/^\[\s?\]\s*/, '')
        .replace(/^(todo|task|need to|must|please|remember to)\s*:?\s*/i, '')
        .trim();

      if (candidate.length < 4 || candidate.length > 140) continue;

      const looksTaskLike = /^(todo|task|need to|must|please|remember to)\b/i.test(line) || /^[-*•\d[]/.test(line);
      if (!looksTaskLike) continue;

      const dedupeKey = candidate.toLowerCase();
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      extracted.push({
        title: candidate,
        description: `Extracted from chat: ${text.slice(0, 220)}`,
        status: 'pending',
        priority: 'medium',
        due_date: inferDueDateFromText(line) || inferDueDateFromText(text),
      });

      if (extracted.length >= 20) return extracted;
    }
  }

  return extracted;
};

const parseJSONArrayFromModelContent = (content) => {
  if (!content || typeof content !== 'string') return null;

  const trimmed = content.trim();
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : null;
  } catch (_) {
    // Continue with fenced-code fallback.
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (!fenced?.[1]) return null;

  try {
    const parsed = JSON.parse(fenced[1]);
    return Array.isArray(parsed) ? parsed : null;
  } catch (_) {
    return null;
  }
};

const resolveAIProviderConfig = () => {
  if (process.env.GROQ_API_KEY) {
    return {
      provider: 'groq',
      apiKey: process.env.GROQ_API_KEY,
      endpoint: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1/chat/completions',
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      endpoint: 'https://api.openai.com/v1/chat/completions',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    };
  }

  return null;
};

const extractTasksWithAI = async (messages) => {
  const aiConfig = resolveAIProviderConfig();
  if (!aiConfig) {
    return heuristicExtractTasks(messages);
  }

  const chatTranscript = messages
    .map((message, index) => {
      const sender = message?.sender_name || message?.sender?.name || 'Member';
      const content = String(message?.message || '').trim();
      return `${index + 1}. ${sender}: ${content}`;
    })
    .filter(Boolean)
    .join('\n');

  if (!chatTranscript.trim()) {
    return [];
  }

  const prompt = [
    'Extract actionable tasks from this event chat.',
    'Return strict JSON only as an array.',
    'Each item format: {"title": string, "description": string, "status": "pending"|"in_progress"|"done", "priority": "low"|"medium"|"high", "due_date": string|null}.',
    'For due_date use YYYY-MM-DD when deadline is clear. Parse phrases like "by tonight" as today and "by tomorrow" as tomorrow.',
    'Rules: concise titles, no duplicates, max 20 items, ignore non-actionable chatter.',
    '',
    chatTranscript,
  ].join('\n');

  try {
    const response = await fetch(aiConfig.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: aiConfig.model,
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content: 'You are an extraction engine. Output only valid JSON array, no markdown and no explanation.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      return heuristicExtractTasks(messages);
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    const parsed = parseJSONArrayFromModelContent(content);
    if (!parsed) {
      return heuristicExtractTasks(messages);
    }

    return parsed
      .map((item) => ({
        title: String(item?.title || '').trim(),
        description: String(item?.description || '').trim() || null,
        status: normalizeStatus(item?.status),
        priority: normalizePriority(item?.priority),
        due_date:
          normalizeDueDate(item?.due_date) ||
          inferDueDateFromText(String(item?.title || '')) ||
          inferDueDateFromText(String(item?.description || '')),
      }))
      .filter((item) => item.title.length >= 4)
      .slice(0, 20);
  } catch (_) {
    return heuristicExtractTasks(messages);
  }
};

const sanitizeTask = (row) => {
  const assignedToIds = Array.isArray(row.assigned_to_ids) ? row.assigned_to_ids.filter(Boolean) : [];
  const assigneeNames = Array.isArray(row.assignee_names) ? row.assignee_names.filter(Boolean) : [];
  const assignees = Array.isArray(row.assignees) ? row.assignees : [];

  return {
    id: row.id,
    event_id: row.event_id,
    created_by: row.created_by,
    title: row.title,
    description: row.description,
    assigned_to: row.assigned_to || assignedToIds[0] || null,
    assigned_to_ids: assignedToIds,
    assignee_name: assigneeNames[0] || row.assignee_name || null,
    assignee_names: assigneeNames,
    assignees,
    status: row.status,
    due_date: row.due_date,
    priority: row.priority,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

const isUuid = (value) =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const normalizeAssignedUserIds = (values) =>
  [...new Set((values || []).map((value) => String(value || '').trim()).filter((value) => isUuid(value)))];

const resolveAssignedUserIds = ({ assigned_to, assigned_to_ids }) => {
  if (Array.isArray(assigned_to_ids)) {
    return normalizeAssignedUserIds(assigned_to_ids);
  }
  return normalizeAssignedUserIds([assigned_to]);
};

const TASK_ASSIGNEE_FIELDS = `
  COALESCE(assignee_meta.assigned_to_ids, ARRAY[]::uuid[]) AS assigned_to_ids,
  COALESCE(assignee_meta.assignee_names, ARRAY[]::text[]) AS assignee_names,
  COALESCE(assignee_meta.assignees, '[]'::json) AS assignees
`;

const TASK_ASSIGNEE_JOIN = `
  LEFT JOIN LATERAL (
    SELECT ARRAY_AGG(ta.user_id ORDER BY u.name, u.id) AS assigned_to_ids,
           ARRAY_AGG(u.name ORDER BY u.name, u.id) AS assignee_names,
           JSON_AGG(JSON_BUILD_OBJECT('id', u.id, 'name', u.name, 'email', u.email) ORDER BY u.name, u.id) AS assignees
    FROM task_assignees ta
    JOIN users u ON u.id = ta.user_id
    WHERE ta.task_id = t.id
  ) assignee_meta ON TRUE
`;

const ensureUsersExist = async (userIds) => {
  if (!userIds.length) return true;

  const result = await query(
    `SELECT COUNT(*)::int AS matched
     FROM users
     WHERE id = ANY($1::uuid[])`,
    [userIds]
  );

  return Number(result.rows[0]?.matched || 0) === userIds.length;
};

const ensureAssigneesBelongToEvent = async (eventId, userIds) => {
  if (!eventId || userIds.length === 0) return true;

  const result = await query(
    `SELECT COUNT(*)::int AS matched
     FROM event_members
     WHERE event_id = $1
       AND user_id = ANY($2::uuid[])`,
    [eventId, userIds]
  );

  return Number(result.rows[0]?.matched || 0) === userIds.length;
};

const syncTaskAssignees = async (taskId, userIds) => {
  await query('DELETE FROM task_assignees WHERE task_id = $1', [taskId]);

  if (!userIds.length) return;

  await query(
    `INSERT INTO task_assignees (task_id, user_id)
     SELECT $1, UNNEST($2::uuid[])
     ON CONFLICT (task_id, user_id) DO NOTHING`,
    [taskId, userIds]
  );
};

const loadTaskWithAssignees = async (taskId) => {
  const result = await query(
    `SELECT t.*,
            ${TASK_ASSIGNEE_FIELDS}
     FROM tasks t
     ${TASK_ASSIGNEE_JOIN}
     WHERE t.id = $1`,
    [taskId]
  );

  return result.rows[0] || null;
};

const ensureTaskAccess = async (userId, taskId) => {
  const result = await query(
    `SELECT t.*,
            ${TASK_ASSIGNEE_FIELDS}
     FROM tasks t
     ${TASK_ASSIGNEE_JOIN}
     WHERE t.id = $1
       AND (
         t.created_by = $2
         OR EXISTS (
           SELECT 1
           FROM event_members em
           WHERE em.event_id = t.event_id
             AND em.user_id = $2
         )
       )`,
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
    const { event_id, title, description, assigned_to, assigned_to_ids, status, due_date, priority } = req.body;
    const userId = req.user.id;
    const assignedUserIds = resolveAssignedUserIds({ assigned_to, assigned_to_ids });
    const normalizedDueDate = normalizeDueDate(due_date);

    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, message: 'title is required.' });
    }

    if (event_id) {
      const hasEventAccess = await ensureEventAccess(userId, event_id);
      if (!hasEventAccess) {
        return res.status(403).json({ success: false, message: 'You do not have access to this event.' });
      }

      const assigneesInEvent = await ensureAssigneesBelongToEvent(event_id, assignedUserIds);
      if (!assigneesInEvent) {
        return res.status(400).json({ success: false, message: 'All assignees must belong to the selected event.' });
      }
    }

    const assigneesExist = await ensureUsersExist(assignedUserIds);
    if (!assigneesExist) {
      return res.status(400).json({ success: false, message: 'One or more assignees are invalid.' });
    }

    const normalizedStatus = status || 'pending';
    const normalizedPriority = priority || 'medium';

    if (!VALID_STATUSES.has(normalizedStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    if (!VALID_PRIORITIES.has(normalizedPriority)) {
      return res.status(400).json({ success: false, message: 'Invalid priority value.' });
    }

    if (due_date && !normalizedDueDate) {
      return res.status(400).json({ success: false, message: 'Invalid due_date format.' });
    }

    if (normalizedDueDate && isPastDueDate(normalizedDueDate)) {
      return res.status(400).json({ success: false, message: 'Task deadline cannot be in the past.' });
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
        assignedUserIds[0] || null,
        normalizedStatus,
        normalizedDueDate,
        normalizedPriority,
      ]
    );

    const createdTask = result.rows[0];
    await syncTaskAssignees(createdTask.id, assignedUserIds);
    const hydratedTask = await loadTaskWithAssignees(createdTask.id);

    for (const assignedUserId of assignedUserIds) {
      if (assignedUserId === userId) continue;

      await sendNotification({
        userId: assignedUserId,
        type: 'task_assigned',
        title: 'New Task Assigned',
        body: `You have been assigned: "${String(title).trim()}"`,
        relatedTaskId: createdTask.id,
        relatedEventId: event_id || null,
        sendEmail: true,
      });
    }

    posthog.capture({
      distinctId: String(userId),
      event: 'task_created',
      properties: {
        task_id: createdTask.id,
        event_id: event_id || null,
        status: normalizedStatus,
        priority: normalizedPriority,
        has_due_date: !!normalizedDueDate,
        assignee_count: assignedUserIds.length,
      },
    });

    return res.status(201).json({ success: true, task: sanitizeTask(hydratedTask || createdTask) });
  } catch (err) {
    return next(err);
  }
};

// GET /api/tasks?event_id=<uuid>&status=pending
const getTasks = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { event_id, status, assigned_to_me } = req.query;

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

    if (assigned_to_me === 'true') {
      params.push(userId);
      whereClause += ` AND EXISTS (
        SELECT 1
        FROM task_assignees ta_me
        WHERE ta_me.task_id = t.id
          AND ta_me.user_id = $${params.length}
      )`;
    }

    const result = await query(
      `SELECT t.*,
              ${TASK_ASSIGNEE_FIELDS}
       FROM tasks t
       ${TASK_ASSIGNEE_JOIN}
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
      assigned_to_ids,
      status,
      due_date,
      priority,
      event_id,
    } = req.body;
    const shouldUpdateEventId = Object.prototype.hasOwnProperty.call(req.body, 'event_id');
    const hasDueDateUpdate = Object.prototype.hasOwnProperty.call(req.body, 'due_date');
    const hasAssignedToUpdate =
      Object.prototype.hasOwnProperty.call(req.body, 'assigned_to') ||
      Object.prototype.hasOwnProperty.call(req.body, 'assigned_to_ids');
    const normalizedDueDate = normalizeDueDate(due_date);

    const targetEventId = shouldUpdateEventId ? event_id || null : existingTask.event_id;

    const nextAssignedUserIds = hasAssignedToUpdate
      ? resolveAssignedUserIds({ assigned_to, assigned_to_ids })
      : normalizeAssignedUserIds(existingTask.assigned_to_ids || [existingTask.assigned_to]);

    if (shouldUpdateEventId && event_id && event_id !== existingTask.event_id) {
      const hasEventAccess = await ensureEventAccess(req.user.id, event_id);
      if (!hasEventAccess) {
        return res.status(403).json({ success: false, message: 'You do not have access to this event.' });
      }
    }

    const assigneesExist = await ensureUsersExist(nextAssignedUserIds);
    if (!assigneesExist) {
      return res.status(400).json({ success: false, message: 'One or more assignees are invalid.' });
    }

    const assigneesInEvent = await ensureAssigneesBelongToEvent(targetEventId, nextAssignedUserIds);
    if (!assigneesInEvent) {
      return res.status(400).json({ success: false, message: 'All assignees must belong to the selected event.' });
    }

    if (status && !VALID_STATUSES.has(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    if (priority && !VALID_PRIORITIES.has(priority)) {
      return res.status(400).json({ success: false, message: 'Invalid priority value.' });
    }

    if (hasDueDateUpdate && due_date && !normalizedDueDate) {
      return res.status(400).json({ success: false, message: 'Invalid due_date format.' });
    }

    if (hasDueDateUpdate && normalizedDueDate && isPastDueDate(normalizedDueDate)) {
      return res.status(400).json({ success: false, message: 'Task deadline cannot be in the past.' });
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
        hasAssignedToUpdate ? nextAssignedUserIds[0] || null : existingTask.assigned_to,
        status || null,
        hasDueDateUpdate ? normalizedDueDate : existingTask.due_date,
        priority || null,
        req.params.id,
      ]
    );

    if (hasAssignedToUpdate) {
      await syncTaskAssignees(req.params.id, nextAssignedUserIds);
    }

    const hydratedTask = await loadTaskWithAssignees(req.params.id);

    return res.json({ success: true, task: sanitizeTask(hydratedTask || result.rows[0]) });
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

    const updatedTask = result.rows[0];
    const hydratedTask = await loadTaskWithAssignees(taskId);

    // Send notification if task is completed
    if (status === 'done' && existingTask.status !== 'done') {
      // Notify creator if someone else completed it
      if (existingTask.created_by && existingTask.created_by !== req.user.id) {
        await sendNotification({
          userId: existingTask.created_by,
          type: 'task_completed',
          title: 'Task Completed',
          body: `"${existingTask.title}" has been marked as complete.`,
          relatedTaskId: taskId,
          relatedEventId: existingTask.event_id,
          sendEmail: false, // Only in-app notification for completions
        });
      }
    }

    posthog.capture({
      distinctId: String(req.user.id),
      event: 'task_status_updated',
      properties: {
        task_id: taskId,
        event_id: existingTask.event_id || null,
        previous_status: existingTask.status,
        new_status: status,
      },
    });

    return res.json({ success: true, task: sanitizeTask(hydratedTask || updatedTask) });
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

// POST /api/tasks/extract-from-chat
const extractTasksFromChat = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { event_id, messages } = req.body;

    if (!event_id) {
      return res.status(400).json({ success: false, message: 'event_id is required.' });
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: 'messages array is required.' });
    }

    const hasEventAccess = await ensureEventAccess(userId, event_id);
    if (!hasEventAccess) {
      return res.status(403).json({ success: false, message: 'You do not have access to this event.' });
    }

    const existingTasksResult = await query(
      `SELECT LOWER(title) AS lowered_title
       FROM tasks
       WHERE event_id = $1`,
      [event_id]
    );
    const existingTitles = new Set(existingTasksResult.rows.map((row) => row.lowered_title));

    const extractedCandidates = await extractTasksWithAI(messages);
    const filteredCandidates = extractedCandidates.filter((item) => !existingTitles.has(item.title.toLowerCase()));

    const createdTasks = [];
    for (const candidate of filteredCandidates) {
      const created = await query(
        `INSERT INTO tasks (event_id, created_by, title, description, assigned_to, status, due_date, priority, updated_at)
         VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, NOW())
         RETURNING *`,
        [
          event_id,
          userId,
          candidate.title,
          candidate.description || null,
          normalizeStatus(candidate.status),
          candidate.due_date || null,
          normalizePriority(candidate.priority),
        ]
      );
      createdTasks.push(sanitizeTask(created.rows[0]));
      existingTitles.add(candidate.title.toLowerCase());
    }

    return res.json({
      success: true,
      extracted_count: extractedCandidates.length,
      created_count: createdTasks.length,
      tasks: createdTasks,
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createTask,
  extractTasksFromChat,
  getTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
};
