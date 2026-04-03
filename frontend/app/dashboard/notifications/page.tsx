"use client";
import { useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

type DashboardActivity = {
  text: string;
  time: string;
  icon: string;
};

type DashboardResponse = {
  success: boolean;
  dashboard?: {
    activity: DashboardActivity[];
  };
  message?: string;
};

type NotificationItem = {
  id: string;
  type: "task" | "ai" | "team";
  title: string;
  body: string;
  time: string;
  read: boolean;
  icon: string;
};

const notifications: NotificationItem[] = [];

const typeColor: Record<string, string> = { task: "var(--overdue)", ai: "var(--accent)", team: "var(--on-track)" };

export default function NotificationsPage() {
  const [filter, setFilter] = useState("All");
  const [items, setItems] = useState(notifications);
  const typeByFilter: Record<string, NotificationItem["type"] | "all"> = {
    All: "all",
    "Task Reminders": "task",
    "AI Alerts": "ai",
    "Team Activity": "team",
  };

  const selectedType = typeByFilter[filter] || "all";
  const filtered = selectedType === "all" ? items : items.filter((n) => n.type === selectedType);
  const unread = items.filter(n => !n.read).length;

  useEffect(() => {
    const loadTeamActivity = async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("eventsync_token") : null;
      if (!token) return;

      try {
        const response = await fetch(`${API_BASE_URL}/dashboard`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result: DashboardResponse = await response.json();
        if (!response.ok || !result.success || !result.dashboard) return;

        const teamNotifications: NotificationItem[] = (result.dashboard.activity || []).map((activity, index) => ({
          id: `team-${index}-${activity.time}-${activity.text}`,
          type: "team",
          title: "Team Activity",
          body: activity.text,
          time: activity.time,
          read: false,
          icon: activity.icon || "💬",
        }));

        setItems((current) => {
          const nonTeamItems = current.filter((item) => item.type !== "team");
          return [...teamNotifications, ...nonTeamItems];
        });
      } catch {
        // Keep base notifications when dashboard data cannot be loaded.
      }
    };

    void loadTeamActivity();
  }, []);

  return (
    <div style={{ padding: '32px 36px', maxWidth: 700 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-1)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            Notifications
            {unread > 0 && <span style={{ background: 'var(--overdue)', color: '#fff', borderRadius: 99, fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px' }}>{unread} new</span>}
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>Stay on top of tasks, alerts, and team activity.</p>
        </div>
        <button onClick={() => setItems(i => i.map(n => ({ ...n, read: true })))} style={{ fontSize: '0.8rem', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Mark all read</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['All', 'Task Reminders', 'AI Alerts', 'Team Activity'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 14px', borderRadius: 99, border: '1px solid var(--border)', background: filter === f ? 'var(--accent)' : 'transparent', color: filter === f ? '#fff' : 'var(--text-2)', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }}>{f}</button>
        ))}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {filtered.map((n, i) => (
          <div key={n.id} onClick={() => setItems(items => items.map(item => item.id === n.id ? { ...item, read: true } : item))} style={{ display: 'flex', gap: 14, padding: '16px 20px', borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', background: !n.read ? 'rgba(124,92,252,0.03)' : 'transparent', cursor: 'pointer', transition: 'background 0.15s', position: 'relative' }}>
            {!n.read && <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 24, background: 'var(--accent)', borderRadius: '0 2px 2px 0' }} />}
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, border: `1px solid ${typeColor[n.type]}22` }}>
              {n.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: n.read ? 500 : 700, fontSize: '0.875rem', color: n.read ? 'var(--text-2)' : 'var(--text-1)', margin: 0, marginBottom: 3 }}>{n.title}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', margin: 0, lineHeight: 1.4 }}>{n.body}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{n.time}</span>
              {!n.read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)' }} />}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-3)' }}>
            <p style={{ fontSize: '1.5rem', marginBottom: 8 }}>🔔</p>
            <p style={{ fontSize: '0.875rem' }}>No notifications in this category.</p>
          </div>
        )}
      </div>

      {/* Preferences hint */}
      <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 16, textAlign: 'center' }}>
        Manage notification preferences in <a href="/dashboard/settings" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Settings →</a>
      </p>
    </div>
  );
}
