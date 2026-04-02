import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative flex flex-col items-center justify-center text-center px-6 py-32 overflow-hidden hero-glow grid-bg">
      {/* Floating orbs */}
      <div style={{ position: 'absolute', top: '10%', left: '10%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(124,92,252,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: 250, height: 250, background: 'radial-gradient(circle, rgba(0,212,170,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div className="fade-up fade-up-1 relative z-10">
        <span style={{ background: 'rgba(124,92,252,0.15)', border: '1px solid rgba(124,92,252,0.3)', color: 'var(--accent)', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', padding: '4px 14px', textTransform: 'uppercase', display: 'inline-block', marginBottom: 24 }}>
          AI-Powered Event Coordination
        </span>
      </div>

      <h1 className="fade-up fade-up-2 relative z-10" style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(2.5rem, 7vw, 5rem)', fontWeight: 800, lineHeight: 1.05, maxWidth: 720, color: 'var(--text-1)', marginBottom: 24 }}>
        Event chaos,{' '}
        <span style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-3))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          finally solved
        </span>
      </h1>

      <p className="fade-up fade-up-3 relative z-10" style={{ fontSize: '1.125rem', color: 'var(--text-2)', maxWidth: 540, lineHeight: 1.7, marginBottom: 40 }}>
        Your team chats, turned into structured tasks automatically. AI extracts action items, assigns owners, and keeps every event on track — so nothing slips through.
      </p>

      <div className="fade-up fade-up-4 relative z-10 flex flex-col sm:flex-row gap-4 items-center">
        <Link href="/signup" className="btn-primary px-7 py-3.5 text-sm" style={{ textDecoration: 'none' }}>
          Start for free — no card needed
        </Link>
        <Link href="/login" className="btn-ghost px-7 py-3.5 text-sm" style={{ textDecoration: 'none' }}>
          See a demo ↗
        </Link>
      </div>

      {/* 3 pain points */}
      <div className="fade-up fade-up-5 relative z-10 flex flex-wrap gap-6 mt-16 justify-center">
        {[
          { icon: '💬', text: 'Tasks lost in group chats' },
          { icon: '📋', text: 'No one knows who owns what' },
          { icon: '⏰', text: 'Deadlines missed last minute' },
        ].map(p => (
          <div key={p.text} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', color: 'var(--text-3)' }}>
            <span style={{ textDecoration: 'line-through' }}>{p.icon} {p.text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
