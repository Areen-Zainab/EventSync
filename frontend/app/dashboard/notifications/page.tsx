"use client";
import { useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  icon: string;
  created_at?: string;
  related_task_id?: string;
  related_event_id?: string;
};

type ApiNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  related_task_id?: string;
  related_event_id?: string;
};

type ApiDashboardActivity = {
  text: string;
  time: string;
  icon: string;
  created_at?: string;
};

type DashboardApiResponse = {
  success: boolean;
  dashboard?: {
    activity?: ApiDashboardActivity[];
  };
};

const typeColor: Record<string, string> = { 
  task_reminder: "var(--overdue)", 
  task_overdue: "var(--overdue)",
  task_assigned: "var(--accent)",
  task_completed: "var(--on-track)",
  ai_alert: "var(--accent)", 
  team_activity: "var(--on-track)",
  event_invite: "var(--accent)",
};

const typeIcon: Record<string, string> = {
  task_reminder: "⏰",
  task_overdue: "⚠️",
  task_assigned: "📋",
  task_completed: "✅",
  ai_alert: "🤖",
  team_activity: "👥",
  event_invite: "📬",
};

const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export default function NotificationsPage() {
  const [filter, setFilter] = useState("All");
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const typeByFilter: Record<string, string> = {
    All: "all",
    "Invitations": "event_invite",
    "Task Reminders": "task_reminder,task_overdue",
    "AI Alerts": "ai_alert",
    "Team Activity": "team_activity,task_assigned,task_completed",
  };

  const selectedType = typeByFilter[filter] || "all";
  const filtered = selectedType === "all" 
    ? items 
    : items.filter((n) => selectedType.split(',').includes(n.type));
  const unread = items.filter(n => !n.read).length;

  const loadNotifications = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("eventsync_token") : null;
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const [notificationsResponse, dashboardResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/notifications`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${API_BASE_URL}/dashboard`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      if (!notificationsResponse.ok) {
        setLoading(false);
        return;
      }

      const result = await notificationsResponse.json();
      if (result.success && result.notifications) {
        const mappedNotifications: NotificationItem[] = result.notifications.map((n: ApiNotification) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          time: getRelativeTime(n.created_at),
          read: n.is_read,
          icon: typeIcon[n.type] || "🔔",
          created_at: n.created_at,
          related_task_id: n.related_task_id,
          related_event_id: n.related_event_id,
        }));

        let mappedActivityItems: NotificationItem[] = [];
        if (dashboardResponse.ok) {
          const dashboardResult: DashboardApiResponse = await dashboardResponse.json();
          const activity = dashboardResult.dashboard?.activity || [];
          mappedActivityItems = activity.map((a, index) => ({
            id: `activity-${a.created_at || index}`,
            type: "team_activity",
            title: "Team Activity",
            body: a.text,
            time: a.time || getRelativeTime(a.created_at || new Date().toISOString()),
            read: true,
            icon: a.icon || "👥",
            created_at: a.created_at,
          }));
        }

        const mergedItems = [...mappedNotifications, ...mappedActivityItems].sort((a, b) => {
          const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bTime - aTime;
        });

        setItems(mergedItems);
      }
    } catch (err) {
      console.error("Error loading notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("eventsync_token") : null;
    if (!token) return;

    try {
      await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setItems(items => items.map(item => item.id === id ? { ...item, read: true } : item));
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const [processingIds, setProcessingIds] = useState<Record<string, boolean>>({});
  const [availableOptions, setAvailableOptions] = useState<Record<string, Array<{ id: string; name: string }>>>({});

  const acceptInvite = async (id: string) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("eventsync_token") : null;
    if (!token) return;

    setProcessingIds(p => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/${id}/accept`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const payload = await res.json();
      if (!res.ok) {
        // If invite limit reached, show available events to replace
        if (res.status === 409 && payload.code === 'INVITE_LIMIT_REACHED') {
          setAvailableOptions(p => ({ ...p, [id]: payload.available_events || [] }));
          return;
        }
        throw new Error(payload.message || "Failed to accept invite.");
      }

      // Remove the invite notification from the list
      setItems(items => items.filter(item => item.id !== id));
    } catch (err) {
      console.error("Error accepting invite:", err);
      // You might show a user-facing error here
    } finally {
      setProcessingIds(p => ({ ...p, [id]: false }));
    }
  };

  const acceptInviteWithReplace = async (id: string, replaceEventId: string) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("eventsync_token") : null;
    if (!token) return;
    setProcessingIds(p => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/${id}/accept`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ replace_event_id: replaceEventId }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Failed to accept invite.");
      setItems(items => items.filter(item => item.id !== id));
      setAvailableOptions(p => ({ ...p, [id]: [] }));
    } catch (err) {
      console.error("Error accepting invite with replace:", err);
    } finally {
      setProcessingIds(p => ({ ...p, [id]: false }));
    }
  };

  const rejectInvite = async (id: string) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("eventsync_token") : null;
    if (!token) return;

    setProcessingIds(p => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/${id}/reject`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Failed to reject invite.");

      // Remove the invite notification from the list
      setItems(items => items.filter(item => item.id !== id));
    } catch (err) {
      console.error("Error rejecting invite:", err);
    } finally {
      setProcessingIds(p => ({ ...p, [id]: false }));
    }
  };

  const markAllAsRead = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("eventsync_token") : null;
    if (!token) return;

    try {
      await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setItems(items => items.map(item => ({ ...item, read: true })));
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  useEffect(() => {
    void loadNotifications();
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
      {unread > 0 && (
        <button onClick={markAllAsRead} style={{ fontSize: '0.8rem', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
          Mark all read
        </button>
      )}
    </div>

    {/* Filters */}
    <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
      {['All', 'Invitations', 'Task Reminders', 'AI Alerts', 'Team Activity'].map(f => (
        <button
          key={f}
          onClick={() => setFilter(f)}
          style={{
            padding: '6px 14px',
            borderRadius: 99,
            border: '1px solid var(--border)',
            background: filter === f ? 'var(--accent)' : 'transparent',
            color: filter === f ? '#fff' : 'var(--text-2)',
            fontSize: '0.75rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          {f}
        </button>
      ))}
    </div>

    <div className="card" style={{ overflow: 'hidden' }}>
      {loading ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-3)' }}>
          <p style={{ fontSize: '0.875rem' }}>Loading notifications...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-3)' }}>
          <p style={{ fontSize: '1.5rem', marginBottom: 8 }}>🔔</p>
          <p style={{ fontSize: '0.875rem' }}>No notifications in this category.</p>
        </div>
      ) : (
        filtered.map((n, i) => (
          <div
            key={n.id}
            onClick={() => !n.read && markAsRead(n.id)}
            style={{
              display: 'flex',
              gap: 14,
              padding: '16px 20px',
              borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
              background: !n.read ? 'rgba(124,92,252,0.03)' : 'transparent',
              cursor: 'pointer',
              transition: 'background 0.15s',
              position: 'relative'
            }}
          >
            {!n.read && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 3,
                  height: 24,
                  background: 'var(--accent)',
                  borderRadius: '0 2px 2px 0'
                }}
              />
            )}

            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'var(--surface-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                flexShrink: 0,
                border: `1px solid ${typeColor[n.type] || 'var(--border)'}22`
              }}
            >
              {n.icon}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontWeight: n.read ? 500 : 700,
                  fontSize: '0.875rem',
                  color: n.read ? 'var(--text-2)' : 'var(--text-1)',
                  margin: 0,
                  marginBottom: 3
                }}
              >
                {n.title}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', margin: 0, lineHeight: 1.4 }}>
                {n.body}
              </p>
              {/* Accept/Reject for event invites */}
              {n.type === 'event_invite' && (
                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); acceptInvite(n.id); }}
                    disabled={!!processingIds[n.id]}
                    className="btn-primary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  >
                    {processingIds[n.id] ? 'Accepting…' : 'Accept'}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); rejectInvite(n.id); }}
                    disabled={!!processingIds[n.id]}
                    className="btn-ghost"
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  >
                    {processingIds[n.id] ? 'Rejecting…' : 'Reject'}
                  </button>
                </div>
              )}
              {n.type === 'event_invite' && availableOptions[n.id] && availableOptions[n.id].length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: 6 }}>You are at your invite limit — pick an event to leave:</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {availableOptions[n.id].map(opt => (
                      <button key={opt.id} onClick={(e) => { e.stopPropagation(); acceptInviteWithReplace(n.id, opt.id); }} className="btn-ghost" style={{ padding: '6px 10px' }}>{`Replace: ${opt.name}`}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{n.time}</span>
              {!n.read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)' }} />}
            </div>
          </div>
        ))
      )}
    </div>

    {/* Preferences hint */}
    <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 16, textAlign: 'center' }}>
      Manage notification preferences in{" "}
      <a href="/dashboard/settings" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
        Settings →
      </a>
    </p>
  </div>
);
}
