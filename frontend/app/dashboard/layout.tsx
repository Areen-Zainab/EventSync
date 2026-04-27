import { Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import TaskDeadlineReminder from "@/components/TaskDeadlineReminder";
import FeedbackPrompt from "@/components/FeedbackPrompt";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <TaskDeadlineReminder />
      <FeedbackPrompt />
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>
      <main style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
