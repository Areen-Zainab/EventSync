"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const bottomItems = [
  { label: "Settings", href: "/dashboard/settings", icon: "⚙" },
];

function SidebarInner() {
  const path = usePathname();
  const searchParams = useSearchParams();
  const [account, setAccount] = useState({ name: "Your account", role: "Organizer", initials: "A" });
  const [plan, setPlan] = useState("Free");
  const [mobileOpen, setMobileOpen] = useState(false);

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
      if (!path.startsWith("/dashboard/event/")) return false;

      const [hrefPath, hrefQuery] = href.split("?");
      if (path !== hrefPath) return false;

      const targetTab = hrefQuery ? new URLSearchParams(hrefQuery).get("tab") : null;
      const currentTab = searchParams.get("tab") || "Overview";
      if (targetTab) {
        return currentTab.toLowerCase() === targetTab.toLowerCase();
      }
      return currentTab.toLowerCase() === "overview";
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
    const loadPlan = () => {
      try {
        const storedPlan = typeof window !== "undefined" ? localStorage.getItem("eventsync_plan") : null;
        setPlan(storedPlan || "Free");
      } catch {
        setPlan("Free");
      }
    };

    loadPlan();

    const onPlanUpdate = () => loadPlan();
    window.addEventListener("storage", onStorage);
    window.addEventListener("eventsync-account-updated", onAccountUpdate as EventListener);
    window.addEventListener("eventsync-plan-updated", onPlanUpdate as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("eventsync-account-updated", onAccountUpdate as EventListener);
      window.removeEventListener("eventsync-plan-updated", onPlanUpdate as EventListener);
    };
  }, []);

  return (
    <>
      <header className="mobile-only" style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 56, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', background: 'rgba(10,10,15,0.95)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ background: 'var(--accent)', borderRadius: 8, width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>⚡</span>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--text-1)', fontSize: '0.95rem' }}>EventSync</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="btn-ghost"
          style={{ width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: 16 }}
        >
          ☰
        </button>
      </header>

      {mobileOpen && (
        <div className="mobile-only" style={{ position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(0,0,0,0.5)' }} onClick={() => setMobileOpen(false)}>
          <aside
            style={{ width: 250, height: '100%', background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '16px 12px' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--text-1)' }}>Menu</span>
              <button type="button" onClick={() => setMobileOpen(false)} style={{ border: 'none', background: 'transparent', color: 'var(--text-2)', fontSize: 18, cursor: 'pointer' }}>×</button>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
              {navItems.map(item => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`sidebar-link${isItemActive(item.href) ? ' active' : ''}`}
                >
                  <span style={{ fontSize: 15 }}>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
              {bottomItems.map(item => (
                <Link key={item.label} href={item.href} onClick={() => setMobileOpen(false)} className="sidebar-link">
                  <span style={{ fontSize: 15 }}>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </aside>
        </div>
      )}

      <aside className="desktop-only" style={{ width: 220, minHeight: '100vh', background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '20px 12px', flexShrink: 0 }}>
      <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginBottom: 28 }}>
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
            <p style={{ fontSize: '0.7rem', color: 'var(--accent)', margin: 0, marginTop: 2, fontWeight: 600 }}>Plan: {plan}</p>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}

export default function Sidebar() {
  return (
    <Suspense fallback={null}>
      <SidebarInner />
    </Suspense>
  );
}
