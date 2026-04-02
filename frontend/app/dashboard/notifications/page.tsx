"use client";
import { useState } from "react";

const notifications = [
  { id: 1, type: "task", title: "Confirm venue deposit", body: "Due in 6 hours · Annual Tech Gala", time: "5 min ago", read: false, icon: "🔴" },
  { id: 2, type: "ai", title: "AI Risk Alert", body: "Vendor deadline not confirmed — 2 days left in 'Spring Cultural Fest'", time: "22 min ago", read: false, icon: "🤖" },
  { id: 3, type: "team", title: "New task assigned to you", body: "Omar assigned 'Book AV Equipment' to you", time: "1 hr ago", read: false, icon: "✅" },
  { id: 4, type: "ai", title: "AI extracted 4 tasks", body: "From recent chat in 'Startup Pitch Night'", time: "2 hr ago", read: true, icon: "🤖" },
  { id: 5, type: "task", title: "Finalize speaker lineup", body: "Due in 18 hours · Annual Tech Gala", time: "3 hr ago", read: true, icon: "⏰" },
  { id: 6, type: "team", title: "Sara Lee joined Tech Gala", body: "Sara was added as a Member by Rania", time: "5 hr ago", read: true, icon: "👤" },
  { id: 7, type: "team", title: "Message pinned in #tech-gala", body: "Alex pinned 'Venue: City Convention Hall, Floor 3'", time: "Yesterday", read: true, icon: "📌" },
];

const typeColor: Record<string, string> = { task: "var(--overdue)", ai: "var(--accent)", team: "var(--on-track)" };

export default function NotificationsPage() {
  const [filter, setFilter] = useState("All");
  const [items, setItems] = useState(notifications);

  const filtered = filter === "All" ? items : items.filter(n => n.type === filter.toLowerCase().replace(' ', ''));
  const unread = items.filter(n => !n.read).length;

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
