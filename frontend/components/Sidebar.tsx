import Link from "next/link";

const navItems = [
  { label: "Dashboard", href: "/home", icon: "🏠" },
  { label: "Workspaces", href: "/home", icon: "📁" },
  { label: "Settings", href: "/home", icon: "⚙️" },
];

export default function Sidebar() {
  return (
    <aside className="w-60 min-h-screen bg-white border-r border-gray-100 flex flex-col py-6 px-4 shrink-0">
      <Link href="/" className="text-xl font-extrabold text-indigo-600 mb-10 px-2">
        EVENTSYNC
      </Link>

      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
