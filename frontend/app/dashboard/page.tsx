import Link from "next/link";

const events = [
  { id: 1, name: "Annual Tech Gala", date: "Apr 15, 2026", status: "on-track", tasks: { done: 18, total: 24 }, members: 8, type: "Academic" },
  { id: 2, name: "Spring Cultural Fest", date: "Apr 28, 2026", status: "at-risk", tasks: { done: 9, total: 20 }, members: 12, type: "Cultural" },
  { id: 3, name: "Startup Pitch Night", date: "May 3, 2026", status: "overdue", tasks: { done: 3, total: 15 }, members: 5, type: "Social" },
];

const todayTasks = [
  { title: "Confirm venue booking", event: "Tech Gala", due: "Today 5pm", priority: "high" },
  { title: "Send speaker invites", event: "Cultural Fest", due: "Today 3pm", priority: "medium" },
  { title: "Finalize catering order", event: "Pitch Night", due: "Today 6pm", priority: "high" },
];

const activity = [
  { text: "AI extracted 3 tasks from #tech-gala chat", time: "2 min ago", icon: "🤖" },
  { text: "Rania confirmed 'Book AV equipment'", time: "18 min ago", icon: "✅" },
  { text: "Spring Cultural Fest moved to At Risk", time: "1 hr ago", icon: "⚠️" },
  { text: "Omar joined Annual Tech Gala", time: "2 hr ago", icon: "👤" },
  { text: "New file attached in #pitch-night", time: "3 hr ago", icon: "📎" },
];

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
  const deadlines = [
    { title: "Venue deposit due", event: "Tech Gala", hoursLeft: 6 },
    { title: "Catering final count", event: "Pitch Night", hoursLeft: 18 },
    { title: "Stage design approval", event: "Cultural Fest", hoursLeft: 32 },
  ];

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1200 }}>
      {/* Header */}
      <div className="fade-up fade-up-1" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-1)', marginBottom: 4 }}>
            Good morning, Alex 👋
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>You have 3 tasks due today and 1 overdue event.</p>
        </div>
        <Link href="/dashboard/events/new" className="btn-primary px-4 py-2.5 text-sm" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          + New Event
        </Link>
      </div>

      {/* Stats row */}
      <div className="fade-up fade-up-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: "Active Events", value: 3, icon: "📅", color: "var(--accent)" },
          { label: "Tasks Today", value: 3, icon: "✅", color: "var(--on-track)" },
          { label: "Overdue Tasks", value: 7, icon: "🔴", color: "var(--overdue)" },
          { label: "Team Members", value: 25, icon: "👥", color: "var(--at-risk)" },
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
              {events.map(ev => (
                <Link key={ev.id} href={`/dashboard/event/${ev.id}`} style={{ textDecoration: 'none' }}>
                  <div className="card-hover" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border)', cursor: 'pointer' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-1)', margin: 0 }}>{ev.name}</p>
                        <StatusBadge status={ev.status} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>📅 {ev.date}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>👥 {ev.members}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>🏷 {ev.type}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 4 }}>{ev.tasks.done}/{ev.tasks.total} tasks</p>
                      <div style={{ width: 80, height: 4, background: 'var(--surface-3)', borderRadius: 99 }}>
                        <div className="progress-fill" style={{ width: `${(ev.tasks.done / ev.tasks.total) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* My Tasks Today */}
          <div className="fade-up fade-up-4 card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem', color: 'var(--text-1)' }}>My Tasks Today</h2>
              <Link href="/dashboard/tasks" style={{ fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none' }}>View board →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {todayTasks.map(task => (
                <div key={task.title} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <input type="checkbox" style={{ accentColor: 'var(--accent)', width: 16, height: 16, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-1)', margin: 0 }}>{task.title}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: 0 }}>{task.event}</p>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: task.priority === 'high' ? 'var(--overdue)' : 'var(--at-risk)', background: task.priority === 'high' ? 'rgba(255,107,107,0.1)' : 'rgba(255,179,71,0.1)', padding: '2px 8px', borderRadius: 99, fontWeight: 600, flexShrink: 0 }}>
                    {task.due}
                  </span>
                </div>
              ))}
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
                <div key={d.title} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10, border: `1px solid ${d.hoursLeft < 12 ? 'rgba(255,107,107,0.3)' : 'var(--border)'}` }}>
                  <div>
                    <p style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-1)', margin: 0 }}>{d.title}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', margin: 0 }}>{d.event}</p>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: d.hoursLeft < 12 ? 'var(--overdue)' : 'var(--at-risk)', fontWeight: 700, flexShrink: 0 }}>{d.hoursLeft}h</span>
                </div>
              ))}
            </div>
          </div>

          {/* Team Activity Feed */}
          <div className="fade-up fade-up-4 card" style={{ padding: 20 }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-1)', marginBottom: 14 }}>Team Activity</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activity.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, paddingBottom: i < activity.length - 1 ? 10 : 0, borderBottom: i < activity.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{a.icon}</span>
                  <div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-2)', margin: 0, lineHeight: 1.4 }}>{a.text}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', margin: 0, marginTop: 2 }}>{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
