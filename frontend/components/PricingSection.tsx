export default function PricingSection() {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'For small teams getting started',
      features: ['2 events', 'Up to 5 members per event', 'AI task extraction', 'Kanban board', 'Basic notifications'],
      cta: 'Get started free',
      highlight: false,
    },
    {
      name: 'Pay-per-Event',
      price: '$4',
      period: 'per event',
      description: 'Pay only when you need more',
      features: ['Unlimited members', 'Full AI features', 'File attachments', 'Risk alerts', 'CSV exports', 'Bundle: 5 events for $15'],
      cta: 'Start with free tier',
      highlight: true,
    },
    {
      name: 'Institution',
      price: 'Custom',
      period: 'per semester',
      description: 'For universities & large orgs',
      features: ['Unlimited events', 'Admin dashboard', 'SSO / SAML', 'Priority support', 'Data export & compliance', 'Onboarding sessions'],
      cta: 'Contact us',
      highlight: false,
    },
  ];

  return (
    <section id="pricing" style={{ padding: '96px 24px', background: 'var(--surface)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, color: 'var(--text-1)', marginBottom: 12 }}>
            Simple, transparent pricing
          </h2>
          <p style={{ color: 'var(--text-2)', fontSize: '1rem' }}>Start free. Pay only when you scale.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(plan => (
            <div key={plan.name} className="card p-6 flex flex-col" style={plan.highlight ? { border: '1px solid rgba(124,92,252,0.5)', position: 'relative' } : {}}>
              {plan.highlight && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '3px 12px', borderRadius: 99, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Most Popular
                </div>
              )}
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{plan.name}</p>
                <div className="flex items-baseline gap-1">
                  <span style={{ fontFamily: 'Syne, sans-serif', fontSize: '2rem', fontWeight: 800, color: 'var(--text-1)' }}>{plan.price}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>/ {plan.period}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginTop: 6 }}>{plan.description}</p>
              </div>

              <ul className="flex flex-col gap-2 mb-8 flex-1">
                {plan.features.map(f => (
                  <li key={f} style={{ fontSize: '0.875rem', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--accent-3)', fontSize: '0.7rem' }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button className={plan.highlight ? 'btn-primary py-2.5 text-sm' : 'btn-ghost py-2.5 text-sm'} style={{ width: '100%' }}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
