"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

type EventStatus = "on-track" | "at-risk" | "overdue";

type DashboardEvent = {
  id: string;
  name: string;
  date: string | null;
  status: EventStatus;
  type: string | null;
  members: number;
  tasks: {
    done: number;
    total: number;
  };
};

type DashboardTask = {
  id: string;
  title: string;
  event_name: string | null;
  due_date: string | null;
  priority: "low" | "medium" | "high";
};

type DashboardActivity = {
  text: string;
  time: string;
  icon: string;
};

type DashboardPayload = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  stats: {
    active_events: number;
    tasks_today: number;
    overdue_tasks: number;
    team_members: number;
  };
  events: DashboardEvent[];
  today_tasks: DashboardTask[];
  deadlines: DashboardTask[];
  activity: DashboardActivity[];
};

type DashboardResponse = {
  success: boolean;
  dashboard?: DashboardPayload;
  message?: string;
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    "on-track": { label: "On Track", cls: "badge-on-track" },
    "at-risk":  { label: "At Risk",  cls: "badge-at-risk"  },
    "overdue":  { label: "Overdue",  cls: "badge-overdue"  },
  };
  const { label, cls } = map[status] ?? map["on-track"];
  return (
    <span className={cls} style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
      {label}
    </span>
  );
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<DashboardPayload | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("eventsync_token") : null;
      if (!token) {
        setError("Please log in again.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${API_BASE_URL}/dashboard`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result: DashboardResponse = await response.json();
        if (!response.ok || !result.success || !result.dashboard) {
          throw new Error(result.message || "Failed to load dashboard.");
        }

        setData(result.dashboard);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  const userName = useMemo(() => {
    if (!data?.user?.name) return "there";
    return data.user.name.split(/\s+/)[0] || data.user.name;
  }, [data]);

  const deadlines = useMemo(() => {
    if (!data?.deadlines) return [] as Array<{ title: string; event: string; hoursLeft: number | null }>;
    return data.deadlines.map((task) => {
      if (!task.due_date) {
        return {
          title: task.title,
          event: task.event_name || "General",
          hoursLeft: null,
        };
      }

      const dueTime = new Date(task.due_date).getTime();
      const hoursLeft = Number.isNaN(dueTime) ? null : Math.max(0, Math.ceil((dueTime - Date.now()) / 3600000));
      return {
        title: task.title,
        event: task.event_name || "General",
        hoursLeft,
      };
    });
  }, [data]);

  const formatEventDate = (value: string | null) => {
    if (!value) return "No date";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "No date";
    return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  const formatTaskDue = (value: string | null) => {
    if (!value) return "No due date";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "No due date";

    const now = new Date();
    const isToday = parsed.toDateString() === now.toDateString();
    const time = parsed.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    if (isToday) return `Today ${time}`;
    return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  if (loading) {
    return <div style={{ padding: "32px 36px", color: "var(--text-3)" }}>Loading dashboard...</div>;
  }

  if (error || !data) {
    return (
      <div style={{ padding: "32px 36px" }}>
        <p style={{ color: "var(--overdue)", marginBottom: 12 }}>{error || "Failed to load dashboard."}</p>
        <Link href="/dashboard/events" style={{ color: "var(--accent)", textDecoration: "none", fontSize: "0.85rem" }}>
          Go to My Events
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1200 }}>
      {/* Header */}
      <div className="fade-up fade-up-1" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-1)', marginBottom: 4 }}>
            Good morning, {userName} 👋
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>
            You have {data.stats.tasks_today} task(s) due today and {data.stats.overdue_tasks} overdue task(s).
          </p>
        </div>
        <Link href="/dashboard/events/new" className="btn-primary px-4 py-2.5 text-sm" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          + New Event
        </Link>
      </div>

      {/* Stats row */}
      <div className="fade-up fade-up-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: "Active Events", value: data.stats.active_events, icon: "📅", color: "var(--accent)" },
          { label: "Tasks Today", value: data.stats.tasks_today, icon: "✅", color: "var(--on-track)" },
          { label: "Overdue Tasks", value: data.stats.overdue_tasks, icon: "🔴", color: "var(--overdue)" },
          { label: "Team Members", value: data.stats.team_members, icon: "👥", color: "var(--at-risk)" },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, fontSize: 40, opacity: 0.06, margin: 8 }}>{s.icon}</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontFamily: 'Syne, sans-serif', fontSize: '2rem', fontWeight: 800, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Active Events */}
          <div className="fade-up fade-up-3 card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem', color: 'var(--text-1)' }}>Active Events</h2>
              <Link href="/dashboard/events" style={{ fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none' }}>View all →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.events.map(ev => (
                <Link key={ev.id} href={`/dashboard/event/${ev.id}`} style={{ textDecoration: 'none' }}>
                  <div className="card-hover" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border)', cursor: 'pointer' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-1)', margin: 0 }}>{ev.name}</p>
                        <StatusBadge status={ev.status} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>📅 {formatEventDate(ev.date)}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>👥 {ev.members}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>🏷 {ev.type || "General"}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 4 }}>{ev.tasks.done}/{ev.tasks.total} tasks</p>
                      <div style={{ width: 80, height: 4, background: 'var(--surface-3)', borderRadius: 99 }}>
                        <div className="progress-fill" style={{ width: `${ev.tasks.total > 0 ? (ev.tasks.done / ev.tasks.total) * 100 : 0}%` }} />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              {data.events.length === 0 && (
                <div className="card" style={{ padding: '12px 14px', borderStyle: 'dashed' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-3)' }}>No events yet. Create your first event.</p>
                </div>
              )}
            </div>
          </div>

          {/* My Tasks Today */}
          <div className="fade-up fade-up-4 card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem', color: 'var(--text-1)' }}>My Tasks Today</h2>
              <Link href="/dashboard/tasks" style={{ fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none' }}>View board →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.today_tasks.map(task => (
                <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <input type="checkbox" style={{ accentColor: 'var(--accent)', width: 16, height: 16, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-1)', margin: 0 }}>{task.title}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: 0 }}>{task.event_name || "General"}</p>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: task.priority === 'high' ? 'var(--overdue)' : 'var(--at-risk)', background: task.priority === 'high' ? 'rgba(255,107,107,0.1)' : 'rgba(255,179,71,0.1)', padding: '2px 8px', borderRadius: 99, fontWeight: 600, flexShrink: 0 }}>
                    {formatTaskDue(task.due_date)}
                  </span>
                </div>
              ))}
              {data.today_tasks.length === 0 && (
                <div className="card" style={{ padding: '12px 14px', borderStyle: 'dashed' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-3)' }}>No tasks due today.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Upcoming Deadlines */}
          <div className="fade-up fade-up-3 card" style={{ padding: 20 }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-1)', marginBottom: 14 }}>⏰ Deadlines (48hr)</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {deadlines.map(d => (
                <div key={`${d.title}-${d.event}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10, border: `1px solid ${d.hoursLeft !== null && d.hoursLeft < 12 ? 'rgba(255,107,107,0.3)' : 'var(--border)'}` }}>
                  <div>
                    <p style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-1)', margin: 0 }}>{d.title}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', margin: 0 }}>{d.event}</p>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: d.hoursLeft !== null && d.hoursLeft < 12 ? 'var(--overdue)' : 'var(--at-risk)', fontWeight: 700, flexShrink: 0 }}>
                    {d.hoursLeft === null ? "No due date" : `${d.hoursLeft}h`}
                  </span>
                </div>
              ))}
              {deadlines.length === 0 && (
                <div className="card" style={{ padding: '12px 14px', borderStyle: 'dashed' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-3)' }}>No upcoming deadlines.</p>
                </div>
              )}
            </div>
          </div>

          {/* Team Activity Feed */}
          <div className="fade-up fade-up-4 card" style={{ padding: 20 }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-1)', marginBottom: 14 }}>Team Activity</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.activity.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, paddingBottom: i < data.activity.length - 1 ? 10 : 0, borderBottom: i < data.activity.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{a.icon}</span>
                  <div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-2)', margin: 0, lineHeight: 1.4 }}>{a.text}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', margin: 0, marginTop: 2 }}>{a.time}</p>
                  </div>
                </div>
              ))}
              {data.activity.length === 0 && (
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-3)' }}>No recent activity yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
