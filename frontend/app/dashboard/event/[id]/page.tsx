"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

type EventStatus = "on-track" | "at-risk" | "overdue";
type TaskStatus = "pending" | "in_progress" | "done";
type TaskPriority = "low" | "medium" | "high";

type EventTask = {
  id: string;
  title: string;
  assignee_name: string | null;
  due_date: string | null;
  status: TaskStatus;
};

type TaskDetail = {
  id: string;
  event_id: string | null;
  title: string;
  description: string | null;
  assigned_to: string | null;
  status: TaskStatus;
  due_date: string | null;
  priority: TaskPriority;
};

type EventMember = {
  user_id: string;
  name: string;
  role: string;
  initials: string;
};

type EventMessage = {
  id: string;
  message: string;
  mine: boolean;
  time: string;
  event_id?: string;
  created_at?: string;
  sender: { name: string } | null;
  parent_message_id?: string | null;
  is_pinned?: boolean;
  mention_user_ids?: string[];
  read_count?: number;
  read_by_me?: boolean;
  attachment?: {
    url?: string | null;
    name?: string | null;
    mime?: string | null;
    size?: number;
  } | null;
};

type EventPayload = {
  id: string;
  name: string;
  date: string | null;
  venue: string | null;
  type: string | null;
  status: EventStatus;
  description: string | null;
  summary: {
    task_total: number;
    task_done: number;
    task_overdue: number;
    completion_rate: number;
    member_count: number;
    days_left: number | null;
  };
  tasks: {
    todo: EventTask[];
    inProgress: EventTask[];
    done: EventTask[];
  };
  members: EventMember[];
  messages: EventMessage[];
};

type ApiResponse = {
  success: boolean;
  event?: EventPayload;
  task?: TaskDetail;
  tasks?: TaskDetail[];
  extracted_count?: number;
  created_count?: number;
  chat_message?: EventMessage;
  messages?: EventMessage[];
  message_ids?: string[];
  message?: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";
const SOCKET_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");
const tabs = ["Overview", "Chat", "Tasks", "Members"] as const;

function StatusBadge({ status }: { status: EventStatus }) {
  const map: Record<EventStatus, { label: string; cls: string }> = {
    "on-track": { label: "On Track", cls: "badge-on-track" },
    "at-risk": { label: "At Risk", cls: "badge-at-risk" },
    "overdue": { label: "Overdue", cls: "badge-overdue" },
  };

  const { label, cls } = map[status];
  return (
    <span
      className={cls}
      style={{
        fontSize: "0.7rem",
        fontWeight: 700,
        padding: "3px 10px",
        borderRadius: 99,
        textTransform: "uppercase",
      }}
    >
      {label}
    </span>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, score)) / 100) * c;

  return (
    <svg width="90" height="90" viewBox="0 0 90 90">
      <circle cx="45" cy="45" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="7" />
      <circle
        cx="45"
        cy="45"
        r={r}
        fill="none"
        stroke="var(--accent-3)"
        strokeWidth="7"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 45 45)"
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
      <text
        x="45"
        y="50"
        textAnchor="middle"
        fill="var(--text-1)"
        fontSize="16"
        fontWeight="800"
        fontFamily="Syne, sans-serif"
      >
        {score}
      </text>
    </svg>
  );
}

const formatDate = (value: string | null): string => {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const formatTaskDue = (value: string | null): string => {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No due date";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const toDateInputValue = (value: string | null): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const getMemberLoad = (memberName: string, tasks: EventTask[]) => {
  const total = tasks.filter((task) => task.assignee_name === memberName).length;
  const done = tasks.filter((task) => task.assignee_name === memberName && task.status === "done").length;
  return { total, done };
};

export default function EventOverviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const eventId = params?.id;

  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");
  const [chatMsg, setChatMsg] = useState("");
  const [replyTo, setReplyTo] = useState<EventMessage | null>(null);
  const [mentionNotice, setMentionNotice] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [eventData, setEventData] = useState<EventPayload | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskDraft, setTaskDraft] = useState<{
    title: string;
    description: string;
    assigned_to: string;
    due_date: string;
    priority: TaskPriority;
    status: TaskStatus;
  } | null>(null);
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskError, setTaskError] = useState("");
  const [extractingTasks, setExtractingTasks] = useState(false);
  const [extractFeedback, setExtractFeedback] = useState("");
  const socketRef = useRef<Socket | null>(null);

  const allTasks = useMemo(() => {
    if (!eventData) return [] as EventTask[];
    return [...eventData.tasks.todo, ...eventData.tasks.inProgress, ...eventData.tasks.done];
  }, [eventData]);

  const currentUserId = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("eventsync_user");
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { id?: string };
      return parsed.id || null;
    } catch {
      return null;
    }
  }, []);

  const canEditEvent = useMemo(() => {
    if (!eventData || !currentUserId) return false;
    const me = eventData.members.find((member) => member.user_id === currentUserId);
    if (!me) return false;
    return me.role !== "Member";
  }, [eventData, currentUserId]);

  useEffect(() => {
    const syncFromQuery = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get("tab");
      if (!tabParam) {
        setTab("Overview");
        return;
      }

      const matchedTab = tabs.find((t) => t.toLowerCase() === tabParam.toLowerCase());
      setTab(matchedTab || "Overview");
    };

    syncFromQuery();
    window.addEventListener("popstate", syncFromQuery);
    return () => window.removeEventListener("popstate", syncFromQuery);
  }, []);

  const selectTab = (nextTab: (typeof tabs)[number]) => {
    setTab(nextTab);
    const query = nextTab === "Overview" ? "" : `?tab=${encodeURIComponent(nextTab)}`;
    router.replace(`/dashboard/event/${eventId}${query}`);
  };

  const createDraftFromTask = (task: TaskDetail) => ({
    title: task.title || "",
    description: task.description || "",
    assigned_to: task.assigned_to || "",
    due_date: toDateInputValue(task.due_date),
    priority: task.priority || "medium",
    status: task.status || "pending",
  });

  const openTaskDetail = async (taskId: string) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("eventsync_token") : null;
    if (!token) {
      setTaskError("Please log in again.");
      return;
    }

    setTaskError("");
    setSelectedTaskId(taskId);

    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: ApiResponse = await response.json();
      if (!response.ok || !data.success || !data.task) {
        throw new Error(data.message || "Failed to load task details.");
      }
      setTaskDraft(createDraftFromTask(data.task));
    } catch (err) {
      setTaskError(err instanceof Error ? err.message : "Failed to load task details.");
    }
  };

  const startCreateTask = (status: TaskStatus) => {
    setTaskError("");
    setSelectedTaskId(null);
    setTaskDraft({
      title: "",
      description: "",
      assigned_to: "",
      due_date: "",
      priority: "medium",
      status,
    });
  };

  const closeTaskPanel = () => {
    setSelectedTaskId(null);
    setTaskDraft(null);
    setTaskError("");
  };

  const saveTask = async () => {
    if (!eventData || !taskDraft) return;
    if (!taskDraft.title.trim()) {
      setTaskError("Task title is required.");
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("eventsync_token") : null;
    if (!token) {
      setTaskError("Please log in again.");
      return;
    }

    setTaskSaving(true);
    setTaskError("");

    const payload = {
      event_id: eventData.id,
      title: taskDraft.title.trim(),
      description: taskDraft.description || null,
      assigned_to: taskDraft.assigned_to || null,
      due_date: taskDraft.due_date || null,
      priority: taskDraft.priority,
      status: taskDraft.status,
    };

    try {
      const endpoint = selectedTaskId ? `${API_BASE_URL}/tasks/${selectedTaskId}` : `${API_BASE_URL}/tasks`;
      const method = selectedTaskId ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data: ApiResponse = await response.json();
      if (!response.ok || !data.success || !data.task) {
        throw new Error(data.message || "Failed to save task.");
      }

      await loadEvent();
      setSelectedTaskId(data.task.id);
      setTaskDraft(createDraftFromTask(data.task));
    } catch (err) {
      setTaskError(err instanceof Error ? err.message : "Failed to save task.");
    } finally {
      setTaskSaving(false);
    }
  };

  const deleteTask = async () => {
    if (!selectedTaskId) return;

    const token = typeof window !== "undefined" ? localStorage.getItem("eventsync_token") : null;
    if (!token) {
      setTaskError("Please log in again.");
      return;
    }

    setTaskSaving(true);
    setTaskError("");
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${selectedTaskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: ApiResponse = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete task.");
      }

      await loadEvent();
      closeTaskPanel();
    } catch (err) {
      setTaskError(err instanceof Error ? err.message : "Failed to delete task.");
    } finally {
      setTaskSaving(false);
    }
  };

  const extractTasksFromChat = async () => {
    if (!eventData) return;

    const token = typeof window !== "undefined" ? localStorage.getItem("eventsync_token") : null;
    if (!token) {
      setExtractFeedback("Please log in again.");
      return;
    }

    if (!eventData.messages.length) {
      setExtractFeedback("No chat messages yet to extract from.");
      return;
    }

    setExtractingTasks(true);
    setExtractFeedback("");

    try {
      const response = await fetch(`${API_BASE_URL}/tasks/extract-from-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          event_id: eventData.id,
          messages: eventData.messages.map((message) => ({
            message: message.message,
            sender_name: message.sender?.name || null,
          })),
        }),
      });

      const data: ApiResponse = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to extract tasks from chat.");
      }

      await loadEvent();
      setTab("Tasks");
      setExtractFeedback(
        (data.created_count || 0) > 0
          ? `${data.created_count} AI-extracted task(s) added to the board.`
          : "AI found no new actionable tasks to add."
      );
    } catch (err) {
      setExtractFeedback(err instanceof Error ? err.message : "Failed to extract tasks from chat.");
    } finally {
      setExtractingTasks(false);
    }
  };

  const loadEvent = async () => {
    if (!eventId) {
      setError("Invalid event id.");
      setLoading(false);
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("eventsync_token") : null;
    if (!token) {
      setError("Please log in again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: ApiResponse = await response.json();
      if (!response.ok || !data.success || !data.event) {
        throw new Error(data.message || "Failed to load event details.");
      }

      setEventData(data.event);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load event details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEvent();
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("eventsync_token") : null;
    if (!token) return;

    const socket = io(SOCKET_BASE_URL, {
      auth: { token },
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.emit("chat:joinRoom", { eventId });
    socket.on("chat:newMessage", (message: EventMessage) => {
      setEventData((prev) =>
        prev
          ? {
              ...prev,
              messages: prev.messages.some((m) => m.id === message.id) ? prev.messages : [...prev.messages, message],
            }
          : prev
      );
    });
    socket.on("chat:messagePinned", (message: EventMessage) => {
      setEventData((prev) =>
        prev
          ? {
              ...prev,
              messages: prev.messages.map((m) => (m.id === message.id ? { ...m, ...message } : m)),
            }
          : prev
      );
    });
    socket.on("chat:messageRead", ({ message_ids }: { message_ids: string[] }) => {
      setEventData((prev) =>
        prev
          ? {
              ...prev,
              messages: prev.messages.map((m) =>
                message_ids.includes(m.id) ? { ...m, read_count: (m.read_count || 0) + 1, read_by_me: true } : m
              ),
            }
          : prev
      );
    });
    socket.on("chat:mentionPing", (payload: Array<{ target_user_id: string; message_id: string }>) => {
      if (!Array.isArray(payload) || payload.length === 0) return;
      const me = localStorage.getItem("eventsync_user_id");
      const mention = me ? payload.find((p) => p.target_user_id === me) : payload[0];
      if (mention) {
        setMentionNotice(`You were mentioned in a message.`);
        window.setTimeout(() => setMentionNotice(""), 2500);
      }
    });

    return () => {
      socket.emit("chat:leaveRoom", { eventId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [eventId]);

  const sendMessage = async () => {
    if (!eventId || (!chatMsg.trim() && !selectedFile) || sending) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("eventsync_token") : null;
    if (!token) return;
    setSending(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("message", chatMsg.trim() || (selectedFile ? `Shared file: ${selectedFile.name}` : ""));
      if (replyTo?.id) formData.append("parent_message_id", replyTo.id);
      if (selectedFile) formData.append("attachment", selectedFile);

      const response = await fetch(`${API_BASE_URL}/events/${eventId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data: ApiResponse = await response.json();
      if (!response.ok || !data.success || !data.chat_message) {
        throw new Error(data.message || "Failed to send message.");
      }
      setEventData((prev) =>
        prev
          ? {
              ...prev,
              messages: prev.messages.some((m) => m.id === data.chat_message!.id)
                ? prev.messages
                : [...prev.messages, data.chat_message as EventMessage],
            }
          : prev
      );
      setChatMsg("");
      setReplyTo(null);
      setSelectedFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const togglePin = async (messageId: string) => {
    if (!eventId) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("eventsync_token") : null;
    if (!token) return;
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/messages/${messageId}/pin`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data: ApiResponse = await response.json();
    if (response.ok && data.success && data.chat_message) {
      setEventData((prev) =>
        prev
          ? {
              ...prev,
              messages: prev.messages.map((m) => (m.id === data.chat_message!.id ? { ...m, ...data.chat_message } : m)),
            }
          : prev
      );
    }
  };

  const markRead = async (messageId: string) => {
    if (!eventId) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("eventsync_token") : null;
    if (!token) return;
    await fetch(`${API_BASE_URL}/events/${eventId}/messages/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message_ids: [messageId] }),
    });
  };

  if (loading) {
    return <div style={{ padding: "28px 32px", color: "var(--text-3)" }}>Loading event...</div>;
  }

  if (error || !eventData) {
    return (
      <div style={{ padding: "28px 32px" }}>
        <p style={{ color: "var(--overdue)", marginBottom: 12 }}>{error || "Event not found."}</p>
        <Link href="/dashboard/events" style={{ color: "var(--accent)", textDecoration: "none", fontSize: "0.85rem" }}>
          Back to Events
        </Link>
      </div>
    );
  }

  const daysLeft = eventData.summary.days_left;
  const completionRate = eventData.summary.completion_rate || 0;
  const remainingTasks = Math.max(0, eventData.summary.task_total - eventData.summary.task_done);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "18px 32px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <Link href="/dashboard/events" style={{ fontSize: "0.8rem", color: "var(--text-3)", textDecoration: "none" }}>
            Events
          </Link>
          <span style={{ color: "var(--text-3)" }}>/</span>
          <span style={{ fontSize: "0.8rem", color: "var(--text-2)" }}>{eventData.name}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: "1.25rem", fontWeight: 800, color: "var(--text-1)", margin: 0 }}>
              {eventData.name}
            </h1>
            <StatusBadge status={eventData.status} />
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: "0.8rem", color: "var(--text-2)" }}>
            <span>📅 {formatDate(eventData.date)}</span>
            {daysLeft !== null && (
              <span
                style={{
                  background: "rgba(124,92,252,0.15)",
                  color: "var(--accent)",
                  padding: "4px 12px",
                  borderRadius: 99,
                  fontWeight: 600,
                  fontSize: "0.75rem",
                }}
              >
                {daysLeft >= 0 ? `${daysLeft} days left` : `${Math.abs(daysLeft)} days overdue`}
              </span>
            )}
            {canEditEvent ? (
              <Link
                href={`/dashboard/event/${eventData.id}/edit`}
                className="btn-ghost px-3 py-1.5 text-xs"
                style={{ padding: "6px 12px", textDecoration: "none" }}
              >
                ⚙ Edit Event
              </Link>
            ) : (
              <button
                className="btn-ghost px-3 py-1.5 text-xs"
                style={{ padding: "6px 12px", opacity: 0.6, cursor: "not-allowed" }}
                disabled
                title="Members cannot edit event details"
              >
                ⚙ Edit Event
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "0 32px", display: "flex", gap: 0, flexShrink: 0 }}>
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => selectTab(t)}
            style={{
              padding: "12px 20px",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: tab === t ? "var(--accent)" : "var(--text-2)",
              background: "transparent",
              border: "none",
              borderBottom: `2px solid ${tab === t ? "var(--accent)" : "transparent"}`,
              cursor: "pointer",
              transition: "color 0.15s",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        {tab === "Overview" && (
          <div style={{ padding: "28px 32px", display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, maxWidth: 1100 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {eventData.summary.task_overdue > 0 && (
                <div
                  style={{
                    background: "rgba(255,179,71,0.08)",
                    border: "1px solid rgba(255,179,71,0.3)",
                    borderRadius: 12,
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span>⚠️</span>
                  <p style={{ fontSize: "0.85rem", color: "var(--at-risk)", margin: 0 }}>
                    {eventData.summary.task_overdue} overdue task(s) need attention.
                  </p>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {[
                  { label: "Tasks Done", value: `${eventData.summary.task_done}/${eventData.summary.task_total}`, sub: `${completionRate}% complete` },
                  { label: "Team Size", value: String(eventData.summary.member_count), sub: `${eventData.type || "General"} event` },
                  { label: "Days Left", value: daysLeft === null ? "-" : String(daysLeft), sub: formatDate(eventData.date) },
                ].map((s) => (
                  <div key={s.label} className="card" style={{ padding: 18, textAlign: "center" }}>
                    <p style={{ fontFamily: "Syne, sans-serif", fontSize: "1.75rem", fontWeight: 800, color: "var(--text-1)", marginBottom: 2 }}>
                      {s.value}
                    </p>
                    <p
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        color: "var(--text-3)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {s.label}
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-2)", marginTop: 2 }}>{s.sub}</p>
                  </div>
                ))}
              </div>

              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                  <h3 style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: "0.9rem", color: "var(--text-1)" }}>Task Progress</h3>
                  <button onClick={() => setTab("Tasks")} style={{ fontSize: "0.8rem", color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}>
                    View board →
                  </button>
                </div>
                <div style={{ height: 8, background: "var(--surface-3)", borderRadius: 99, marginBottom: 8 }}>
                  <div className="progress-fill" style={{ width: `${completionRate}%`, height: "100%" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-3)" }}>
                  <span>
                    {eventData.summary.task_done} of {eventData.summary.task_total} tasks completed
                  </span>
                  <span>{remainingTasks} remaining</span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="card" style={{ padding: 24, textAlign: "center" }}>
                <p
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--text-3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    marginBottom: 16,
                  }}
                >
                  Execution Stability
                </p>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                  <ScoreRing score={completionRate} />
                </div>
                <p style={{ fontSize: "0.8rem", color: "var(--text-2)", lineHeight: 1.5 }}>
                  Derived from completion rate and overdue task count.
                </p>
              </div>

              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: "0.875rem", color: "var(--text-1)", marginBottom: 14 }}>
                  Team Roster
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {eventData.members.map((member) => {
                    const load = getMemberLoad(member.name, allTasks);
                    return (
                      <div key={member.user_id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, var(--accent), var(--accent-3))",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            color: "#fff",
                            flexShrink: 0,
                          }}
                        >
                          {member.initials}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--text-1)", margin: 0 }}>{member.name}</p>
                          <p style={{ fontSize: "0.7rem", color: "var(--text-3)", margin: 0 }}>{member.role}</p>
                        </div>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-3)" }}>
                          {load.done}/{load.total || 0}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "Chat" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ padding: "12px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-3)" }}>
                Convert checklist/chat TODO lines into tasks.
              </p>
              <button
                type="button"
                className="btn-ghost px-3 py-1.5 text-xs"
                onClick={() => void extractTasksFromChat()}
                disabled={extractingTasks}
              >
                {extractingTasks ? "Extracting..." : "Extract tasks to board"}
              </button>
            </div>
            {extractFeedback && (
              <div style={{ margin: "8px 24px 0", fontSize: "0.78rem", color: "var(--accent)" }}>{extractFeedback}</div>
            )}
            {mentionNotice && (
              <div style={{ margin: "12px 24px 0", fontSize: "0.8rem", color: "var(--accent)" }}>{mentionNotice}</div>
            )}
            <div style={{ flex: 1, overflow: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              {eventData.messages.length === 0 && (
                <p style={{ color: "var(--text-3)", fontSize: "0.85rem" }}>No messages yet for this event.</p>
              )}
              {eventData.messages.map((m) => (
                <div
                  key={m.id}
                  style={{ display: "flex", flexDirection: "column", alignItems: m.mine ? "flex-end" : "flex-start", gap: 3 }}
                >
                  {!m.mine && <span style={{ fontSize: "0.72rem", color: "var(--text-3)", paddingLeft: 4 }}>{m.sender?.name || "Member"}</span>}
                  <div
                    className={`chat-bubble ${m.mine ? "mine" : "theirs"}`}
                    style={{ marginLeft: m.parent_message_id ? 16 : 0, border: m.is_pinned ? "1px solid var(--accent)" : undefined }}
                  >
                    {m.is_pinned ? "📌 " : ""}
                    {m.message}
                    {m.attachment?.url && (
                      <div style={{ marginTop: 8 }}>
                        <a href={`${SOCKET_BASE_URL}${m.attachment.url}`} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>
                          {m.attachment.name || "Attachment"}
                        </a>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: "0.65rem", color: "var(--text-3)" }}>{m.time}</span>
                    <button onClick={() => setReplyTo(m)} style={{ border: "none", background: "transparent", color: "var(--text-3)", fontSize: "0.7rem", cursor: "pointer" }}>
                      Reply
                    </button>
                    <button onClick={() => void togglePin(m.id)} style={{ border: "none", background: "transparent", color: "var(--text-3)", fontSize: "0.7rem", cursor: "pointer" }}>
                      {m.is_pinned ? "Unpin" : "Pin"}
                    </button>
                    <button onClick={() => void markRead(m.id)} style={{ border: "none", background: "transparent", color: "var(--text-3)", fontSize: "0.7rem", cursor: "pointer" }}>
                      Seen {m.read_count || 0}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid var(--border)",
                background: "var(--surface)",
                display: "flex",
                gap: 10,
                alignItems: "center",
              }}
            >
              <input
                className="input"
                style={{ flex: 1, borderRadius: 24 }}
                placeholder="Write a message... use @name to mention"
                value={chatMsg}
                onChange={(e) => setChatMsg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
              />
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                style={{ maxWidth: 220, fontSize: "0.75rem" }}
              />
              <button className="btn-primary px-4 py-2 text-sm" style={{ flexShrink: 0 }} disabled={sending || (!chatMsg.trim() && !selectedFile)} onClick={() => void sendMessage()}>
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
            {replyTo && (
              <div style={{ fontSize: "0.75rem", color: "var(--text-3)", padding: "0 24px 12px" }}>
                Replying to: {replyTo.message.slice(0, 50)}
                <button onClick={() => setReplyTo(null)} style={{ marginLeft: 8, border: "none", background: "transparent", color: "var(--accent)", cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            )}
            {selectedFile && <div style={{ fontSize: "0.75rem", color: "var(--text-3)", padding: "0 24px 12px" }}>Attachment: {selectedFile.name}</div>}
          </div>
        )}

        {tab === "Tasks" && (
          <div style={{ padding: "24px 32px" }}>
            {taskError && <p style={{ color: "var(--overdue)", marginBottom: 12, fontSize: "0.8rem" }}>{taskError}</p>}
            <div style={{ display: "grid", gridTemplateColumns: taskDraft ? "1fr 320px" : "1fr", gap: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {[
                { col: "To Do", key: "todo" as const, color: "var(--text-3)" },
                { col: "In Progress", key: "inProgress" as const, color: "var(--at-risk)" },
                { col: "Done", key: "done" as const, color: "var(--on-track)" },
              ].map(({ col, key, color }) => (
                <div key={col} className="kanban-col" style={{ padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {col}
                    </span>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-3)",
                        background: "var(--surface-2)",
                        padding: "2px 8px",
                        borderRadius: 99,
                      }}
                    >
                      {eventData.tasks[key].length}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {eventData.tasks[key].map((task) => (
                      <div
                        key={task.id}
                        className="card card-hover"
                        onClick={() => void openTaskDetail(task.id)}
                        style={{
                          padding: "12px 14px",
                          cursor: "pointer",
                          border: selectedTaskId === task.id ? "1px solid var(--accent)" : "1px solid var(--border)",
                          background: selectedTaskId === task.id ? "rgba(124,92,252,0.06)" : "var(--surface)",
                        }}
                      >
                        <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-1)", marginBottom: 8 }}>{task.title}</p>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>{task.assignee_name || "Unassigned"}</span>
                          <span style={{ fontSize: "0.7rem", color: key === "todo" ? "var(--at-risk)" : "var(--text-3)" }}>
                            📅 {formatTaskDue(task.due_date)}
                          </span>
                        </div>
                      </div>
                    ))}
                    {eventData.tasks[key].length === 0 && (
                      <div className="card" style={{ padding: "12px 14px", borderStyle: "dashed" }}>
                        <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-3)" }}>No tasks in this column.</p>
                        <button
                          type="button"
                          onClick={() => startCreateTask(key === "todo" ? "pending" : key === "inProgress" ? "in_progress" : "done")}
                          style={{
                            display: "inline-flex",
                            marginTop: 8,
                            fontSize: "0.78rem",
                            color: "var(--accent)",
                            textDecoration: "none",
                            fontWeight: 600,
                            background: "none",
                            border: "none",
                            padding: 0,
                            cursor: "pointer",
                          }}
                        >
                          + Add task
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => startCreateTask(key === "todo" ? "pending" : key === "inProgress" ? "in_progress" : "done")}
                      style={{
                        width: "100%",
                        padding: "8px",
                        background: "none",
                        border: "1px dashed var(--border)",
                        borderRadius: 10,
                        color: "var(--text-3)",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                      }}
                    >
                      + Add task
                    </button>
                  </div>
                </div>
              ))}
              </div>

              {taskDraft && (
                <div className="card" style={{ padding: 20, height: "fit-content", position: "sticky", top: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                    <h3 style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: "0.95rem", color: "var(--text-1)" }}>
                      Task Detail
                    </h3>
                    <button onClick={closeTaskPanel} style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: 18 }}>
                      ×
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: "0.8rem" }}>
                    <div>
                      <p style={{ color: "var(--text-3)", marginBottom: 4 }}>Title</p>
                      <input className="input" value={taskDraft.title} onChange={(e) => setTaskDraft((prev) => (prev ? { ...prev, title: e.target.value } : prev))} />
                    </div>

                    <div>
                      <p style={{ color: "var(--text-3)", marginBottom: 4 }}>Description</p>
                      <textarea className="input" rows={3} value={taskDraft.description} onChange={(e) => setTaskDraft((prev) => (prev ? { ...prev, description: e.target.value } : prev))} />
                    </div>

                    <div>
                      <p style={{ color: "var(--text-3)", marginBottom: 4 }}>Assigned To</p>
                      <select className="input" value={taskDraft.assigned_to} onChange={(e) => setTaskDraft((prev) => (prev ? { ...prev, assigned_to: e.target.value } : prev))}>
                        <option value="">Unassigned</option>
                        {eventData.members.map((member) => (
                          <option key={member.user_id} value={member.user_id}>
                            {member.name} ({member.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div>
                        <p style={{ color: "var(--text-3)", marginBottom: 4 }}>Due Date</p>
                        <input className="input" type="date" value={taskDraft.due_date} onChange={(e) => setTaskDraft((prev) => (prev ? { ...prev, due_date: e.target.value } : prev))} />
                      </div>
                      <div>
                        <p style={{ color: "var(--text-3)", marginBottom: 4 }}>Priority</p>
                        <select className="input" value={taskDraft.priority} onChange={(e) => setTaskDraft((prev) => (prev ? { ...prev, priority: e.target.value as TaskPriority } : prev))}>
                          <option value="low">low</option>
                          <option value="medium">medium</option>
                          <option value="high">high</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                      <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                        Status
                      </p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                        {[
                          { label: "To Do", value: "pending" as TaskStatus },
                          { label: "In Progress", value: "in_progress" as TaskStatus },
                          { label: "Done", value: "done" as TaskStatus },
                        ].map((s) => (
                          <button
                            key={s.value}
                            onClick={() => setTaskDraft((prev) => (prev ? { ...prev, status: s.value } : prev))}
                            style={{
                              padding: "7px",
                              borderRadius: 8,
                              border: "1px solid var(--border)",
                              background: taskDraft.status === s.value ? "rgba(124,92,252,0.15)" : "transparent",
                              color: taskDraft.status === s.value ? "var(--accent)" : "var(--text-3)",
                              fontSize: "0.72rem",
                              fontWeight: 500,
                              cursor: "pointer",
                            }}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                    <button className="btn-primary text-sm" style={{ flex: 1, padding: "10px" }} onClick={() => void saveTask()} disabled={taskSaving}>
                      {taskSaving ? "Saving..." : "Save Task"}
                    </button>
                    {selectedTaskId && (
                      <button className="btn-ghost text-sm" style={{ padding: "10px 12px" }} onClick={() => void deleteTask()} disabled={taskSaving}>
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "Members" && (
          <div style={{ padding: "28px 32px", maxWidth: 700 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: "1rem", color: "var(--text-1)" }}>
                Team Members ({eventData.members.length})
              </h2>
            </div>

            <div className="card" style={{ overflow: "hidden" }}>
              {eventData.members.map((member, i) => (
                <div
                  key={member.user_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "16px 20px",
                    borderBottom: i < eventData.members.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, var(--accent), var(--accent-3))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    {member.initials}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-1)", margin: 0 }}>{member.name}</p>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-3)", margin: 0 }}>{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
