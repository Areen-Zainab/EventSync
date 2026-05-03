
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";


type TaskStatus = "pending" | "in_progress" | "done";
type TaskPriority = "low" | "medium" | "high";

type Task = {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  assigned_to_ids: string[];
  assignee_names: string[];
  status: TaskStatus;
  due_date: string | null;
  priority: TaskPriority;
  created_at: string;
  updated_at: string;
};

type EventItem = {
  id: string;
  name: string;
};

type ApiTasksResponse = {
  success: boolean;
  message?: string;
  tasks: Task[];
};

type ApiTaskResponse = {
  success: boolean;
  message?: string;
  task: Task;
};

type ApiEventsResponse = {
  success: boolean;
  message?: string;
  events: EventItem[];
};

type FilterMode =
  | "all"
  | "my_tasks"
  | "by_member"
  | "by_deadline"
  | "at_risk"
  | "today"
  | "high_priority"
  | "low_priority";
type SortMode = "deadline" | "priority" | "assignee";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

const priorityColor: Record<string, string> = {
  high: "var(--overdue)",
  medium: "var(--at-risk)",
  low: "var(--text-3)",
};

export default function TasksPage() {
  /** After a drag, the browser still fires a click on the card — suppress opening the detail panel. */
  const suppressTaskCardClickRef = useRef(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterMode>("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("deadline");
  const [personalViewOnly, setPersonalViewOnly] = useState(false);
  const [createTargetStatus, setCreateTargetStatus] = useState<TaskStatus>("pending");
  const [draft, setDraft] = useState<{
    event_id: string;
    title: string;
    description: string;
    assigned_to: string;
    due_date: string;
    priority: TaskPriority;
    status: TaskStatus;
  } | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("eventsync_token") : null;
  const currentUser =
    typeof window !== "undefined" ? localStorage.getItem("eventsync_user") : null;
  const currentUserId: string | null = useMemo(() => {
    if (!currentUser) return null;
    try {
      const parsed = JSON.parse(currentUser) as { id?: string };
      return parsed.id || null;
    } catch {
      return null;
    }
  }, [currentUser]);

  const availableEvents = useMemo(() => {
    const fromEvents = events.map((eventItem) => ({ id: eventItem.id, name: eventItem.name }));
    const knownIds = new Set(fromEvents.map((eventItem) => eventItem.id));
    const fromTasks = tasks
      .map((task) => task.event_id)
      .filter((eventId): eventId is string => Boolean(eventId) && !knownIds.has(eventId))
      .map((eventId) => ({ id: eventId, name: `Event ${eventId.slice(0, 8)}...` }));
    return [...fromEvents, ...fromTasks];
  }, [events, tasks]);

  const eventNameById = useMemo(
    () => Object.fromEntries(availableEvents.map((eventItem) => [eventItem.id, eventItem.name])),
    [availableEvents]
  );

  const filterOptions: Array<{ label: string; value: FilterMode }> = [
    { label: "All Tasks", value: "all" },
    { label: "My Tasks", value: "my_tasks" },
    { label: "Today", value: "today" },
    { label: "High Priority", value: "high_priority" },
    { label: "Low Priority", value: "low_priority" },
    { label: "By Member", value: "by_member" },
    { label: "By Deadline", value: "by_deadline" },
    { label: "At Risk", value: "at_risk" },
  ];

  const activeFilterLabel = filterOptions.find((option) => option.value === activeFilter)?.label || "All Tasks";

  const formatDate = (isoDate: string | null): string => {
    if (!isoDate) return "No due date";
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return "No due date";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const getTodayDateInputValue = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getLocalDateKey = (value: string | null): string | null => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const buildDraftFromTask = (task: Task | null) => ({
    event_id: task?.event_id || availableEvents[0]?.id || "",
    title: task?.title || "",
    description: task?.description || "",
    assigned_to: task?.assigned_to_ids?.length ? task.assigned_to_ids.join(",") : task?.assigned_to || "",
    due_date: task?.due_date ? task.due_date.slice(0, 10) : "",
    priority: task?.priority || "medium",
    status: task?.status || "pending",
  });

  const applyFiltersAndSort = (inputTasks: Task[]): Task[] => {
    let nextTasks = [...inputTasks];
    if ((activeFilter === "my_tasks" || personalViewOnly) && currentUserId) {
      nextTasks = nextTasks.filter((task) => (task.assigned_to_ids || []).includes(currentUserId));
    }
    if (activeFilter === "today") {
      const todayKey = getTodayDateInputValue();
      nextTasks = nextTasks.filter((task) => getLocalDateKey(task.due_date) === todayKey);
    }
    if (activeFilter === "high_priority") {
      nextTasks = nextTasks.filter((task) => task.priority === "high");
    }
    if (activeFilter === "low_priority") {
      nextTasks = nextTasks.filter((task) => task.priority === "low");
    }
    if (activeFilter === "at_risk") {
      const now = Date.now();
      nextTasks = nextTasks.filter((task) => {
        const isHighPriority = task.priority === "high";
        const isOverdue =
          !!task.due_date && task.status !== "done" && new Date(task.due_date).getTime() < now;
        return isHighPriority || isOverdue;
      });
    }

    nextTasks.sort((a, b) => {
      if (activeFilter === "by_member" || sortMode === "assignee") {
        const aAssignee = a.assignee_names?.[0] || a.assigned_to || "unassigned";
        const bAssignee = b.assignee_names?.[0] || b.assigned_to || "unassigned";
        return aAssignee.localeCompare(bAssignee);
      }
      if (activeFilter === "by_deadline" || sortMode === "deadline") {
        const aTime = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      }
      if (sortMode === "priority") {
        const order: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
        return order[a.priority] - order[b.priority];
      }
      return 0;
    });

    return nextTasks;
  };

  const filteredTasks = useMemo(
    () => applyFiltersAndSort(tasks),
    [tasks, activeFilter, sortMode, currentUserId, personalViewOnly]
  );

  const groupedTasks = useMemo(
    () => ({
      todo: filteredTasks.filter((task) => task.status === "pending"),
      inProgress: filteredTasks.filter((task) => task.status === "in_progress"),
      done: filteredTasks.filter((task) => task.status === "done"),
    }),
    [filteredTasks]
  );

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) || null;

  const authHeaders = (): HeadersInit => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  });

  const loadData = async (): Promise<void> => {
    if (!token) {
      setError("Please log in again to manage tasks.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [tasksRes, eventsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/tasks`, { headers: authHeaders() }),
        fetch(`${API_BASE_URL}/events`, { headers: authHeaders() }),
      ]);

      const tasksData: ApiTasksResponse = await tasksRes.json();
      const eventsData: ApiEventsResponse = await eventsRes.json();

      if (!tasksRes.ok || !tasksData.success) {
        throw new Error(tasksData.message || "Failed to fetch tasks.");
      }
      if (!eventsRes.ok || !eventsData.success) {
        throw new Error(eventsData.message || "Failed to fetch events.");
      }

      setTasks(tasksData.tasks || []);
      setEvents(eventsData.events || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load task board.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    const syncFromQuery = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const taskIdFromQuery = searchParams.get("taskId");
      const eventIdFromQuery = searchParams.get("eventId");
      const statusFromQuery = searchParams.get("status");

      if (taskIdFromQuery) {
        const taskExists = tasks.some((task) => task.id === taskIdFromQuery);
        if (taskExists) {
          setSelectedTaskId(taskIdFromQuery);
          setDraft(null);
        }
        return;
      }

      if (!eventIdFromQuery && !statusFromQuery) return;

      const statusMap: Record<string, TaskStatus> = {
        todo: "pending",
        inProgress: "in_progress",
        done: "done",
        pending: "pending",
        in_progress: "in_progress",
      };
      const resolvedStatus = statusMap[statusFromQuery || ""] || "pending";
      const resolvedEventId =
        eventIdFromQuery && availableEvents.some((eventItem) => eventItem.id === eventIdFromQuery)
          ? eventIdFromQuery
          : availableEvents[0]?.id || "";

      setCreateTargetStatus(resolvedStatus);
      setSelectedTaskId(null);
      setDraft({
        event_id: resolvedEventId,
        title: "",
        description: "",
        assigned_to: "",
        due_date: "",
        priority: "medium",
        status: resolvedStatus,
      });
    };

    syncFromQuery();
    window.addEventListener("popstate", syncFromQuery);
    return () => window.removeEventListener("popstate", syncFromQuery);
  }, [tasks, availableEvents]);

  const startCreateTask = (status: TaskStatus): void => {
    setCreateTargetStatus(status);
    setSelectedTaskId(null);
    setDraft({
      event_id: availableEvents[0]?.id || "",
      title: "",
      description: "",
      assigned_to: "",
      due_date: "",
      priority: "medium",
      status,
    });
  };

  const startEditTask = (task: Task): void => {
    setDraft(buildDraftFromTask(task));
  };

  const resetDraft = (): void => setDraft(null);

  const saveDraft = async (): Promise<void> => {
    if (!draft) return;
    if (!draft.title.trim()) {
      setError("Task title is required.");
      return;
    }
    if (draft.due_date && draft.due_date < getTodayDateInputValue()) {
      setError("Task deadline cannot be in the past.");
      return;
    }
    if (!token) {
      setError("Please log in again to continue.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const isEditing = Boolean(selectedTask && selectedTask.id);
      const endpoint = isEditing ? `${API_BASE_URL}/tasks/${selectedTask?.id}` : `${API_BASE_URL}/tasks`;
      const method = isEditing ? "PUT" : "POST";

      const payload = {
        event_id: draft.event_id || null,
        title: draft.title.trim(),
        description: draft.description || null,
        assigned_to_ids: draft.assigned_to
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        due_date: draft.due_date || null,
        priority: draft.priority,
        status: draft.status || createTargetStatus,
      };

      const response = await fetch(endpoint, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      const data: ApiTaskResponse = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to save task.");
      }

      await loadData();
      setSelectedTaskId(data.task.id);
      resetDraft();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save task.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const updateStatus = async (taskId: string, status: TaskStatus): Promise<boolean> => {
    if (!token) {
      setError("Please log in again to continue.");
      return false;
    }
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      const data: ApiTaskResponse = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update status.");
      }
      await loadData();
      setSelectedTaskId(taskId);
      if (draft) setDraft({ ...draft, status });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update status.";
      setError(message);
      return false;
    }
  };

  const onDragEnd = async (result: DropResult): Promise<void> => {
    suppressTaskCardClickRef.current = true;
    window.setTimeout(() => {
      suppressTaskCardClickRef.current = false;
    }, 100);

    const { destination, source, draggableId } = result;
    if (!destination) return;

    const fromStatus = source.droppableId as TaskStatus;
    const toStatus = destination.droppableId as TaskStatus;

    // Only persist cross-column moves; within-column drops snap back.
    if (fromStatus === toStatus) return;

    const prevTasksSnapshot = tasks;
    // Optimistic UI update for smooth drag feel.
    setTasks((prev) => prev.map((t) => (t.id === draggableId ? { ...t, status: toStatus } : t)));

    const ok = await updateStatus(draggableId, toStatus);
    if (!ok) {
      // Backend rejected update; revert optimistic UI.
      setTasks(prevTasksSnapshot);
    }
  };

  const removeTask = async (taskId: string): Promise<void> => {
    if (!token) {
      setError("Please log in again to continue.");
      return;
    }
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data: { success: boolean; message?: string } = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete task.");
      }
      await loadData();
      setSelectedTaskId(null);
      resetDraft();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete task.";
      setError(message);
    }
  };

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-1)', marginBottom: 4 }}>Task Board</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>All tasks across your events</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="btn-ghost px-3 py-1.5 text-xs"
              onClick={() => setShowFilterMenu((prev) => !prev)}
              style={{
                minWidth: 150,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                borderColor: showFilterMenu ? 'var(--accent)' : undefined,
                color: showFilterMenu ? 'var(--accent)' : undefined,
                background: showFilterMenu ? 'rgba(124,92,252,0.12)' : undefined,
              }}
              title="Filter tasks"
            >
              <span>Filter: {activeFilterLabel}</span>
              <span style={{ fontSize: 10 }}>▾</span>
            </button>

            {showFilterMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  minWidth: 190,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 14,
                  boxShadow: '0 16px 40px rgba(0,0,0,0.28)',
                  padding: 6,
                  zIndex: 30,
                }}
              >
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setActiveFilter(option.value);
                      setShowFilterMenu(false);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: 'none',
                      background: activeFilter === option.value ? 'rgba(124,92,252,0.14)' : 'transparent',
                      color: activeFilter === option.value ? 'var(--accent)' : 'var(--text-2)',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            className="btn-ghost px-3 py-1.5 text-xs"
            onClick={() => setPersonalViewOnly((prev) => !prev)}
            style={{
              borderColor: personalViewOnly ? 'var(--accent)' : undefined,
              color: personalViewOnly ? 'var(--accent)' : undefined,
              background: personalViewOnly ? 'rgba(124,92,252,0.12)' : undefined,
            }}
            title="Show only tasks assigned to you"
          >
            👤 {personalViewOnly ? 'Personal view: ON' : 'Personal view'}
          </button>
          <button className="btn-primary text-sm px-4 py-2.5" onClick={() => startCreateTask("pending")}>+ Add Task</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: "All Tasks", value: "all" as const },
          { label: "My Tasks", value: "my_tasks" as const },
          { label: "Today", value: "today" as const },
          { label: "High Priority", value: "high_priority" as const },
          { label: "Low Priority", value: "low_priority" as const },
          { label: "By Member", value: "by_member" as const },
          { label: "By Deadline", value: "by_deadline" as const },
          { label: "At Risk", value: "at_risk" as const },
        ].map((f) => (
          <button key={f.value} onClick={() => setActiveFilter(f.value)} style={{ padding: '6px 14px', borderRadius: 99, border: '1px solid var(--border)', background: activeFilter === f.value ? 'rgba(124,92,252,0.15)' : 'transparent', color: activeFilter === f.value ? 'var(--accent)' : 'var(--text-2)', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer' }}>{f.label}</button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)', borderRadius: 8, padding: '6px 10px', fontSize: '0.75rem', cursor: 'pointer' }}>
            <option value="deadline">Sort: Deadline</option>
            <option value="priority">Sort: Priority</option>
            <option value="assignee">Sort: Assignee</option>
          </select>
        </div>
      </div>
      {error && <p style={{ color: 'var(--overdue)', marginBottom: 12, fontSize: '0.8rem' }}>{error}</p>}
      {loading && <p style={{ color: 'var(--text-3)', marginBottom: 12, fontSize: '0.8rem' }}>Loading tasks...</p>}

      <div style={{ display: 'grid', gridTemplateColumns: selectedTaskId || draft ? '1fr 320px' : '1fr', gap: 20 }}>
        {/* Kanban */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { col: "To Do", key: "todo" as const, color: "#a0a0c0" },
            { col: "In Progress", key: "inProgress" as const, color: "var(--at-risk)" },
            { col: "Done", key: "done" as const, color: "var(--on-track)" },
          ].map(({ col, key, color }) => (
            <div key={col} className="kanban-col" style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 99 }}>{groupedTasks[key].length}</span>
              </div>
              <Droppable droppableId={key === "todo" ? "pending" : key === "inProgress" ? "in_progress" : "done"}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      minHeight: 120,
                      padding: 2,
                      borderRadius: 10,
                    }}
                  >
                    {groupedTasks[key].map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(dragProvided) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            onClick={() => {
                              if (suppressTaskCardClickRef.current) return;
                              setSelectedTaskId(task.id === selectedTaskId ? null : task.id);
                              resetDraft();
                            }}
                            className="card"
                            style={{ padding: '12px 14px', cursor: 'pointer', border: selectedTaskId === task.id ? '1px solid var(--accent)' : '1px solid var(--border)', background: selectedTaskId === task.id ? 'rgba(124,92,252,0.06)' : 'var(--surface)', transition: 'all 0.15s', ...dragProvided.draggableProps.style }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 8 }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: priorityColor[task.priority], marginTop: 5, flexShrink: 0 }} />
                              <p style={{ fontSize: '0.85rem', fontWeight: 500, color: key === 'done' ? 'var(--text-3)' : 'var(--text-1)', margin: 0, textDecoration: key === 'done' ? 'line-through' : 'none' }}>{task.title}</p>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent-3))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 700, color: '#fff' }}>{((task.assignee_names?.[0] || task.assigned_to || "U")[0] || "U").toUpperCase()}</div>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>
                                  {task.assignee_names?.length ? task.assignee_names.join(', ') : task.assigned_to ? task.assigned_to.slice(0, 8) : "Unassigned"}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>{formatDate(task.due_date)}</span>
                            </div>
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: 6 }}>📅 {eventNameById[task.event_id] || "Unknown event"}</p>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
              <button onClick={() => startCreateTask(key === "todo" ? "pending" : key === "inProgress" ? "in_progress" : "done")} style={{ width: '100%', padding: '8px', background: 'none', border: '1px dashed var(--border)', borderRadius: 10, color: 'var(--text-3)', fontSize: '0.75rem', cursor: 'pointer' }}>+ Add task</button>
            </div>
          ))}
          </div>
        </DragDropContext>

        {/* Task Detail Panel */}
        {(selectedTask || draft) && (
          <div className="card" style={{ padding: 20, height: 'fit-content', position: 'sticky', top: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-1)' }}>Task Detail</h3>
              <button onClick={() => { setSelectedTaskId(null); resetDraft(); }} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: '0.8rem' }}>
              <div>
                <p style={{ color: 'var(--text-3)', marginBottom: 4 }}>Title</p>
                <input
                  className="input"
                  value={draft ? draft.title : (selectedTask?.title || "")}
                  onChange={(e) => setDraft((prev) => ({ ...(prev || buildDraftFromTask(selectedTask)), title: e.target.value }))}
                />
              </div>

              <div>
                <p style={{ color: 'var(--text-3)', marginBottom: 4 }}>Description</p>
                <textarea
                  className="input"
                  rows={3}
                  value={draft ? draft.description : (selectedTask?.description || "")}
                  onChange={(e) => setDraft((prev) => ({ ...(prev || buildDraftFromTask(selectedTask)), description: e.target.value }))}
                />
              </div>

              <div>
                <p style={{ color: 'var(--text-3)', marginBottom: 4 }}>Event</p>
                <select className="input" value={draft ? draft.event_id : (selectedTask?.event_id || "")} onChange={(e) => setDraft((prev) => ({ ...(prev || buildDraftFromTask(selectedTask)), event_id: e.target.value }))}>
                  <option value="">None (no event)</option>
                  {availableEvents.map((eventItem) => <option key={eventItem.id} value={eventItem.id}>{eventItem.name}</option>)}
                </select>
              </div>

              <div>
                <p style={{ color: 'var(--text-3)', marginBottom: 4 }}>Assigned To (User IDs, comma separated)</p>
                <input
                  className="input"
                  value={draft ? draft.assigned_to : (selectedTask?.assigned_to_ids?.join(",") || selectedTask?.assigned_to || "")}
                  onChange={(e) => setDraft((prev) => ({ ...(prev || buildDraftFromTask(selectedTask)), assigned_to: e.target.value }))}
                  placeholder="Example: id-1,id-2"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <p style={{ color: 'var(--text-3)', marginBottom: 4 }}>Due Date</p>
                  <input className="input" type="date" min={getTodayDateInputValue()} value={draft ? draft.due_date : (selectedTask?.due_date ? selectedTask.due_date.slice(0, 10) : "")} onChange={(e) => setDraft((prev) => ({ ...(prev || buildDraftFromTask(selectedTask)), due_date: e.target.value }))} />
                </div>
                <div>
                  <p style={{ color: 'var(--text-3)', marginBottom: 4 }}>Priority</p>
                  <select className="input" value={draft ? draft.priority : (selectedTask?.priority || "medium")} onChange={(e) => setDraft((prev) => ({ ...(prev || buildDraftFromTask(selectedTask)), priority: e.target.value as TaskPriority }))}>
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                  </select>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Status</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  {[
                    { label: "To Do", value: "pending" as TaskStatus },
                    { label: "In Progress", value: "in_progress" as TaskStatus },
                    { label: "Done", value: "done" as TaskStatus },
                  ].map((s) => (
                    <button key={s.value} onClick={() => {
                      if (selectedTask) {
                        void updateStatus(selectedTask.id, s.value);
                      } else {
                        setDraft((prev) => prev ? { ...prev, status: s.value } : prev);
                      }
                    }} style={{ padding: '7px', borderRadius: 8, border: '1px solid var(--border)', background: ((draft?.status || selectedTask?.status) === s.value) ? 'rgba(124,92,252,0.15)' : 'transparent', color: ((draft?.status || selectedTask?.status) === s.value) ? 'var(--accent)' : 'var(--text-3)', fontSize: '0.72rem', fontWeight: 500, cursor: 'pointer' }}>{s.label}</button>
                  ))}
                </div>
              </div>
            </div>

            {draft && (
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button className="btn-primary text-sm" style={{ flex: 1, padding: '10px' }} onClick={() => void saveDraft()} disabled={isSaving}>{isSaving ? "Saving..." : "Save Task"}</button>
                <button className="btn-ghost text-sm" style={{ padding: '10px 12px' }} onClick={resetDraft}>Cancel</button>
              </div>
            )}
            {selectedTask && !draft && (
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button className="btn-ghost text-sm" style={{ flex: 1, padding: '10px' }} onClick={() => startEditTask(selectedTask)}>
                  Edit fields
                </button>
                <button className="btn-ghost text-sm" style={{ padding: '10px 12px' }} onClick={() => void removeTask(selectedTask.id)}>Delete</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
