"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "⊞" },
  { label: "My Events", href: "/dashboard/events", icon: "📅" },
  { label: "Tasks", href: "/dashboard/tasks", icon: "✅" },
  { label: "Chat", href: "/dashboard/chat", icon: "💬" },
  { label: "Notifications", href: "/dashboard/notifications", icon: "🔔" },
  { label: "Team", href: "/dashboard/team", icon: "👥" },
];

const bottomItems = [
  { label: "Settings", href: "/dashboard/settings", icon: "⚙" },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside style={{ width: 220, minHeight: '100vh', background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '20px 12px', flexShrink: 0 }}>
      <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginBottom: 28 }}>
        <span style={{ background: 'var(--accent)', borderRadius: 8, width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>⚡</span>
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--text-1)', fontSize: '1rem' }}>EventSync</span>
      </Link>

      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 12px', marginBottom: 6 }}>Menu</div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {navItems.map(item => (
          <Link
            key={item.label}
            href={item.href}
            className={`sidebar-link${path === item.href ? ' active' : ''}`}
          >
            <span style={{ fontSize: 15 }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
        {bottomItems.map(item => (
          <Link key={item.label} href={item.href} className="sidebar-link">
            <span style={{ fontSize: 15 }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}

        {/* User avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginTop: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent-3))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>A</div>
          <div>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>Alex Khan</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', margin: 0 }}>Organizer</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
