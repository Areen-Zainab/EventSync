import Sidebar from "@/components/Sidebar";
import TaskDeadlineReminder from "@/components/TaskDeadlineReminder";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <TaskDeadlineReminder />
      <Sidebar />
      <main style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
