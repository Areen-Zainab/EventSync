"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

type ApiNotification = {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  related_event_id?: string;
};

export default function InvitationsPage() {
  const [invites, setInvites] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");

  const loadInvites = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("eventsync_token") : null;
    if (!token) {
      setError("Please log in to view invitations.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/notifications?type=event_invite`, { headers: { Authorization: `Bearer ${token}` } });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.message || "Failed to load invites.");
      setInvites(payload.notifications || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invites.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadInvites(); }, []);

  const acceptInvite = async (id: string, replaceEventId?: string | null) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("eventsync_token") : null;
    if (!token) return;
    setProcessingIds(p => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/${id}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: replaceEventId ? JSON.stringify({ replace_event_id: replaceEventId }) : undefined,
      });
      const payload = await res.json();
      if (!res.ok) {
        if (res.status === 409 && payload.code === 'INVITE_LIMIT_REACHED') {
          // keep and surface to user
          alert(payload.message || 'Invite limit reached. Choose an event to replace in settings.');
          return;
        }
        throw new Error(payload.message || 'Failed to accept invite.');
      }
      setInvites(i => i.filter(x => x.id !== id));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to accept invite.');
    } finally {
      setProcessingIds(p => ({ ...p, [id]: false }));
    }
  };

  const rejectInvite = async (id: string) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("eventsync_token") : null;
    if (!token) return;
    setProcessingIds(p => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/${id}/reject`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || 'Failed to reject invite.');
      setInvites(i => i.filter(x => x.id !== id));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to reject invite.');
    } finally {
      setProcessingIds(p => ({ ...p, [id]: false }));
    }
  };

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.5rem', fontWeight: 800 }}>Invitations</h1>
          <p style={{ color: 'var(--text-2)' }}>Accept or reject event invitations sent by teammates.</p>
        </div>
        <Link href="/dashboard/events" className="btn-ghost" style={{ textDecoration: 'none' }}>Back to events</Link>
      </div>

      {loading ? <p>Loading…</p> : null}
      {error && <p style={{ color: 'var(--overdue)' }}>{error}</p>}

      <div style={{ display: 'grid', gap: 10 }}>
        {invites.length === 0 && !loading && <div className="card" style={{ padding: 20 }}>No invitations.</div>}
        {invites.map(inv => (
          <div key={inv.id} className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700 }}>{inv.title}</p>
              <p style={{ margin: 0, color: 'var(--text-3)' }}>{inv.body}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" onClick={() => acceptInvite(inv.id)} disabled={!!processingIds[inv.id]}>{processingIds[inv.id] ? 'Accepting…' : 'Accept'}</button>
              <button className="btn-ghost" onClick={() => rejectInvite(inv.id)} disabled={!!processingIds[inv.id]}>Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
