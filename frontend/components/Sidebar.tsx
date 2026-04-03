"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const bottomItems = [
  { label: "Settings", href: "/dashboard/settings", icon: "⚙" },
];

export default function Sidebar() {
  const path = usePathname();
  const [account, setAccount] = useState({ name: "Your account", role: "Organizer", initials: "A" });

  const eventMatch = path.match(/^\/dashboard\/event\/([^/]+)/);
  const activeEventId = eventMatch?.[1] || null;
  const isEventContext = Boolean(activeEventId);

  const navItems = isEventContext
    ? [
        { label: "My Events", href: "/dashboard/events", icon: "📅" },
        { label: "Chat", href: `/dashboard/event/${activeEventId}?tab=Chat`, icon: "💬" },
        { label: "Tasks", href: `/dashboard/event/${activeEventId}?tab=Tasks`, icon: "✅" },
        { label: "Notifications", href: "/dashboard/notifications", icon: "🔔" },
        { label: "Team", href: `/dashboard/event/${activeEventId}?tab=Members`, icon: "👥" },
      ]
    : [
        { label: "My Events", href: "/dashboard/events", icon: "📅" },
        { label: "Notifications", href: "/dashboard/notifications", icon: "🔔" },
      ];

  const isItemActive = (href: string): boolean => {
    if (href.startsWith("/dashboard/event/")) {
      return path.startsWith("/dashboard/event/");
    }
    if (href === "/dashboard/events") {
      return path === "/dashboard" || path.startsWith("/dashboard/events");
    }
    return path === href;
  };

  useEffect(() => {
    const loadAccount = () => {
      try {
        const stored = typeof window !== "undefined" ? localStorage.getItem("eventsync_user") : null;
        if (!stored) return;
        const parsed = JSON.parse(stored) as { name?: string; role?: string };
        const name = parsed.name || "Your account";
        const initials = name
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0])
          .join("")
          .toUpperCase();
        setAccount({ name, role: parsed.role || "Organizer", initials: initials || "A" });
      } catch {
        setAccount({ name: "Your account", role: "Organizer", initials: "A" });
      }
    };

    loadAccount();

    const onStorage = () => loadAccount();
    const onAccountUpdate = () => loadAccount();
    window.addEventListener("storage", onStorage);
    window.addEventListener("eventsync-account-updated", onAccountUpdate as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("eventsync-account-updated", onAccountUpdate as EventListener);
    };
  }, []);

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
            className={`sidebar-link${isItemActive(item.href) ? ' active' : ''}`}
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
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent-3))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>{account.initials}</div>
          <div>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>{account.name}</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', margin: 0 }}>{account.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
