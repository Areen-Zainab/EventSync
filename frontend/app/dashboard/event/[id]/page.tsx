"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { connectSocket } from "@/lib/socket";

type EventStatus = "on-track" | "at-risk" | "overdue";

type EventTask = {
  id: string;
  title: string;
  assignee_name: string | null;
  due_date: string | null;
  status: "pending" | "in_progress" | "done";
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
  read_by_count?: number;
  sender: { name: string } | null;
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
  message?: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";
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

const getMemberLoad = (memberName: string, tasks: EventTask[]) => {
  const total = tasks.filter((task) => task.assignee_name === memberName).length;
  const done = tasks.filter((task) => task.assignee_name === memberName && task.status === "done").length;
  return { total, done };
};

export default function EventOverviewPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const eventId = params?.id;

  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");
  const [chatMsg, setChatMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [eventData, setEventData] = useState<EventPayload | null>(null);
  const [unreadMentions, setUnreadMentions] = useState(0);

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

  const tabFromQuery = useMemo(() => {
    const raw = (searchParams.get("tab") || "").toLowerCase();
    if (raw === "chat") return "Chat";
    if (raw === "tasks") return "Tasks";
    if (raw === "members" || raw === "team") return "Members";
    return "Overview";
  }, [searchParams]);

  const allTasks = useMemo(() => {
    if (!eventData) return [] as EventTask[];
    return [...eventData.tasks.todo, ...eventData.tasks.inProgress, ...eventData.tasks.done];
  }, [eventData]);

  const canEditEvent = useMemo(() => {
    if (!eventData || !currentUserId) return false;
    const me = eventData.members.find((member) => member.user_id === currentUserId);
    if (!me) return false;
    return me.role !== "Member";
  }, [eventData, currentUserId]);

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

  const loadUnreadMentions = async () => {
    if (!eventId) return;
    try {
      const data = await apiFetch<{ unread_count: number }>(`/events/${eventId}/mentions/unread`);
      setUnreadMentions(data.unread_count || 0);
    } catch {
      setUnreadMentions(0);
    }
  };

  const sendMessage = async () => {
    if (!eventId || !chatMsg.trim()) return;
    try {
      await apiFetch(`/events/${eventId}/messages`, {
        method: "POST",
        body: JSON.stringify({ message: chatMsg }),
      });
      setChatMsg("");
      await loadEvent();
      await loadUnreadMentions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
    }
  };

  useEffect(() => {
    void loadEvent();
    void loadUnreadMentions();
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    const socket = connectSocket();
    socket.emit("join_event", { eventId });
    socket.on("message_created", ({ eventId: incomingEventId }) => {
      if (incomingEventId === eventId) {
        void loadEvent();
        void loadUnreadMentions();
      }
    });
    return () => {
      socket.emit("leave_event", { eventId });
      socket.off("message_created");
    };
  }, [eventId]);

  useEffect(() => {
    setTab(tabFromQuery);
  }, [tabFromQuery]);

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
                type="button"
                className="btn-ghost px-3 py-1.5 text-xs"
                style={{ padding: "6px 12px", opacity: 0.6, cursor: "not-allowed" }}
                title="Members cannot edit event details"
                disabled
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
            onClick={() => setTab(t)}
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
            {t === "Chat" && unreadMentions > 0 ? `${t} (${unreadMentions})` : t}
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
                  <div className={`chat-bubble ${m.mine ? "mine" : "theirs"}`}>{m.message}</div>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-3)" }}>{m.time} {m.read_by_count ? `· Seen by ${m.read_by_count}` : ""}</span>
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
                placeholder="Message this event room... use @name to mention"
                value={chatMsg}
                onChange={(e) => setChatMsg(e.target.value)}
              />
              <button className="btn-primary px-4 py-2 text-sm" style={{ flexShrink: 0 }} onClick={() => void sendMessage()}>
                Send
              </button>
            </div>
          </div>
        )}

        {tab === "Tasks" && (
          <div style={{ padding: "24px 32px" }}>
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
                      <div key={task.id} className="card card-hover" style={{ padding: "12px 14px", cursor: "pointer" }}>
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
                      </div>
                    )}
                  </div>
                </div>
              ))}
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
