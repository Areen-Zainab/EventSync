const features = [
  {
    icon: "🤖",
    title: "AI Task Extraction",
    description: "Automatically pull action items from team conversations and turn them into structured tasks.",
  },
  {
    icon: "🔔",
    title: "Smart Notifications",
    description: "Get context-aware alerts that surface what matters most, right when you need it.",
  },
  {
    icon: "🤝",
    title: "Team Coordination",
    description: "Assign, track, and collaborate on event tasks across your entire team in one place.",
  },
  {
    icon: "⚡",
    title: "Real-Time Updates",
    description: "Stay in sync with live updates across workspaces so nothing slips through the cracks.",
  },
];

export default function FeatureSection() {
  return (
    <section id="features" className="py-24 px-6 bg-white">
      <div className="max-w-5xl mx-auto text-center mb-14">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Everything your team needs</h2>
        <p className="mt-4 text-gray-500 text-lg">
          Built for event teams who move fast and can't afford to miss a beat.
        </p>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((f) => (
          <div
            key={f.title}
            className="bg-gray-50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
          >
            <div className="text-3xl mb-4">{f.icon}</div>
            <h3 className="font-semibold text-gray-900 text-lg mb-2">{f.title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
