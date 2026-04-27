import Link from "next/link";

export default function Footer() {
  const links = [
    { label: 'Features', href: '#' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms', href: '#' },
  ];

  return (
    <footer style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)', padding: '40px 24px' }}>
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <span style={{ background: 'var(--accent)', borderRadius: 8, width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>⚡</span>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--text-1)' }}>EventSync</span>
        </div>

        <div className="flex gap-6 text-sm" style={{ color: 'var(--text-3)' }}>
          {links.map(link => (
            <Link key={link.label} href={link.href} style={{ color: 'inherit', textDecoration: 'none' }} className="hover:text-white transition-colors">{link.label}</Link>
          ))}
        </div>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
          © {new Date().getFullYear()} EventSync. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
