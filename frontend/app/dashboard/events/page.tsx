"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

type EventCard = {
  id: string;
  name: string;
  date: string | null;
  status: string;
  tasks?: { done?: number; total?: number };
  members?: number;
  type?: string;
  venue?: string | null;
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    "on-track": { label: "On Track", cls: "badge-on-track" },
    "at-risk": { label: "At Risk", cls: "badge-at-risk" },
    "overdue": { label: "Overdue", cls: "badge-overdue" },
  };
  const { label, cls } = map[status] ?? map["on-track"];
  return <span className={cls} style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>;
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadEvents = async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("eventsync_token") : null;
      if (!token) {
        setError("Please log in again to view events.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/events`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to load events.");
        }
        setEvents(Array.isArray(data.events) ? data.events : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load events.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadEvents();
  }, []);

  const totalEvents = useMemo(() => events.length, [events]);

  const formatDate = (value: string | null) => {
    if (!value) return "No date";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "No date";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="mobile-page-padding" style={{ padding: '32px 36px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, gap: 10, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-1)', marginBottom: 4 }}>My Events</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>{totalEvents} events</p>
        </div>
        <Link href="/dashboard/events/new" className="btn-primary px-4 py-2.5 text-sm" style={{ textDecoration: 'none' }}>+ New Event</Link>
      </div>

      {isLoading && <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginBottom: 16 }}>Loading events...</p>}
      {error && <p style={{ fontSize: '0.85rem', color: 'var(--overdue)', marginBottom: 16 }}>{error}</p>}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
        {['All', 'On Track', 'At Risk', 'Overdue', 'Academic', 'Cultural', 'Social', 'Sports'].map(f => (
          <button key={f} style={{ padding: '6px 14px', borderRadius: 99, border: '1px solid var(--border)', background: f === 'All' ? 'var(--accent)' : 'transparent', color: f === 'All' ? '#fff' : 'var(--text-2)', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }}>{f}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 18 }}>
        {events.map(ev => (
          <Link key={ev.id} href={`/dashboard/event/${ev.id}`} style={{ textDecoration: 'none' }}>
            <div className="card card-hover" style={{ padding: 20, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: ev.status === 'on-track' ? 'var(--on-track)' : ev.status === 'at-risk' ? 'var(--at-risk)' : 'var(--overdue)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--text-1)', fontSize: '0.95rem', marginBottom: 4 }}>{ev.name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>📅 {formatDate(ev.date)} · 📍 {ev.venue || 'TBD'}</p>
                </div>
                <StatusBadge status={ev.status} />
              </div>

              <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 14 }}>
                <span>👥 {ev.members || 0} members</span>
                <span>🏷 {ev.type || 'General'}</span>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 6 }}>
                  <span>Tasks</span>
                  <span>{ev.tasks?.done || 0}/{ev.tasks?.total || 0}</span>
                </div>
                <div style={{ height: 5, background: 'var(--surface-3)', borderRadius: 99 }}>
                  <div className="progress-fill" style={{ width: `${(ev.tasks?.total ? ((ev.tasks?.done || 0) / ev.tasks.total) * 100 : 0)}%` }} />
                </div>
              </div>
            </div>
          </Link>
        ))}

        {/* New event CTA */}
        <Link href="/dashboard/events/new" style={{ textDecoration: 'none' }}>
          <div className="card card-hover" style={{ padding: 20, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 160, border: '1px dashed var(--border)' }}>
            <span style={{ fontSize: 28, marginBottom: 10 }}>+</span>
            <p style={{ fontWeight: 600, color: 'var(--text-2)', fontSize: '0.875rem' }}>Create New Event</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
