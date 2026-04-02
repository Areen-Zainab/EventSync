import Link from "next/link";

const events = [
  { id: 1, name: "Annual Tech Gala", date: "Apr 15, 2026", status: "on-track", tasks: { done: 18, total: 24 }, members: 8, type: "Academic", venue: "City Convention Hall" },
  { id: 2, name: "Spring Cultural Fest", date: "Apr 28, 2026", status: "at-risk", tasks: { done: 9, total: 20 }, members: 12, type: "Cultural", venue: "Main Auditorium" },
  { id: 3, name: "Startup Pitch Night", date: "May 3, 2026", status: "overdue", tasks: { done: 3, total: 15 }, members: 5, type: "Social", venue: "Innovation Lab" },
  { id: 4, name: "Alumni Meet 2026", date: "May 20, 2026", status: "on-track", tasks: { done: 2, total: 10 }, members: 4, type: "Social", venue: "Campus Grounds" },
];

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
  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-1)', marginBottom: 4 }}>My Events</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>{events.length} events · 2 free tier events used</p>
        </div>
        <Link href="/dashboard/events/new" className="btn-primary px-4 py-2.5 text-sm" style={{ textDecoration: 'none' }}>+ New Event</Link>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['All', 'On Track', 'At Risk', 'Overdue', 'Academic', 'Cultural', 'Social', 'Sports'].map(f => (
          <button key={f} style={{ padding: '6px 14px', borderRadius: 99, border: '1px solid var(--border)', background: f === 'All' ? 'var(--accent)' : 'transparent', color: f === 'All' ? '#fff' : 'var(--text-2)', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }}>{f}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
        {events.map(ev => (
          <Link key={ev.id} href={`/dashboard/event/${ev.id}`} style={{ textDecoration: 'none' }}>
            <div className="card card-hover" style={{ padding: 20, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: ev.status === 'on-track' ? 'var(--on-track)' : ev.status === 'at-risk' ? 'var(--at-risk)' : 'var(--overdue)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--text-1)', fontSize: '0.95rem', marginBottom: 4 }}>{ev.name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>📅 {ev.date} · 📍 {ev.venue}</p>
                </div>
                <StatusBadge status={ev.status} />
              </div>

              <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 14 }}>
                <span>👥 {ev.members} members</span>
                <span>🏷 {ev.type}</span>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 6 }}>
                  <span>Tasks</span>
                  <span>{ev.tasks.done}/{ev.tasks.total}</span>
                </div>
                <div style={{ height: 5, background: 'var(--surface-3)', borderRadius: 99 }}>
                  <div className="progress-fill" style={{ width: `${(ev.tasks.done / ev.tasks.total) * 100}%` }} />
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
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 4 }}>Free tier: 2 events</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
