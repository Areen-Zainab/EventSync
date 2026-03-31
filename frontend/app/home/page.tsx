import Sidebar from "@/components/Sidebar";
import DashboardCard from "@/components/DashboardCard";

const mockUser = "Alex";

const cards = [
  { title: "Total Workspaces", value: 4, icon: "📁", description: "Active event workspaces" },
  { title: "Pending Tasks", value: 12, icon: "✅", description: "Tasks awaiting completion" },
  { title: "Notifications", value: 5, icon: "🔔", description: "Unread alerts" },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, <span className="text-indigo-600">{mockUser}</span> 👋
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Here&apos;s what&apos;s happening across your workspaces.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {cards.map((card) => (
            <DashboardCard key={card.title} {...card} />
          ))}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Recent Activity</h2>
          <ul className="space-y-3">
            {[
              { text: "AI extracted 3 tasks from #general chat", time: "2 min ago" },
              { text: "New workspace 'Annual Gala' created", time: "1 hr ago" },
              { text: "Task 'Book venue' marked complete", time: "3 hr ago" },
              { text: "5 new notifications from Team Alpha", time: "Yesterday" },
            ].map((item, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{item.text}</span>
                <span className="text-gray-400 text-xs shrink-0 ml-4">{item.time}</span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
