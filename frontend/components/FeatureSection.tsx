const features = [
  {
    icon: "🤖",
    title: "AI Task Extraction",
    description: "NLP scans every chat message and surfaces action items with suggested assignees and deadlines — you just confirm.",
    accent: "#7c5cfc",
  },
  {
    icon: "📊",
    title: "Execution Stability Score",
    description: "A real-time 0–100 health score per event. Know instantly if you're On Track, At Risk, or Overdue.",
    accent: "#00d4aa",
  },
  {
    icon: "🔔",
    title: "Smart Risk Alerts",
    description: "AI proactively flags overdue dependencies before they cascade — 'Vendor deadline unconfirmed, 2 days left.'",
    accent: "#ffb347",
  },
  {
    icon: "🎯",
    title: "Kanban Task Board",
    description: "Visual To Do → In Progress → Done flow with overdue highlighting and one-tap reassignment.",
    accent: "#ff6b6b",
  },
  {
    icon: "💬",
    title: "Event-Scoped Chat",
    description: "Purpose-built chat per event. @ mentions, pinned messages, file attachments — not another Slack.",
    accent: "#7c5cfc",
  },
  {
    icon: "👥",
    title: "Role-Based Access",
    description: "Organizer, Coordinator, or Member — each sees exactly what they need. Invite by email or shareable link.",
    accent: "#00d4aa",
  },
];

export default function FeatureSection() {
  return (
    <section id="features" style={{ padding: '96px 24px', background: 'var(--bg)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, color: 'var(--text-1)', marginBottom: 12 }}>
            Everything your team needs to ship events
          </h2>
          <p style={{ color: 'var(--text-2)', fontSize: '1rem', maxWidth: 480, margin: '0 auto' }}>
            Built for student orgs, campus teams, and anyone who runs events fast.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div key={f.title} className="card card-hover p-6" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${f.accent}, transparent)` }} />
              <div style={{ fontSize: 28, marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem', color: 'var(--text-1)', marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', lineHeight: 1.6 }}>{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
