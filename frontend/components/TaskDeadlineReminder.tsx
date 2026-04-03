"use client";

import { useEffect } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";
const REMINDER_WINDOW_HOURS = 24;
const POLL_INTERVAL_MS = 5 * 60 * 1000;

type Task = {
  id: string;
  title: string;
  due_date: string | null;
  status: "pending" | "in_progress" | "done";
};

type TasksResponse = {
  success: boolean;
  tasks?: Task[];
};

function reminderKey(task: Task): string {
  return `eventsync_deadline_reminder_${task.id}_${task.due_date || "none"}`;
}

function isDueSoon(task: Task): boolean {
  if (!task.due_date || task.status === "done") return false;
  const dueTime = new Date(task.due_date).getTime();
  if (Number.isNaN(dueTime)) return false;
  const hoursLeft = (dueTime - Date.now()) / 3600000;
  return hoursLeft > 0 && hoursLeft <= REMINDER_WINDOW_HOURS;
}

export default function TaskDeadlineReminder() {
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    const requestNotificationPermission = async () => {
      if (Notification.permission === "default") {
        try {
          await Notification.requestPermission();
        } catch {
          // Ignore permission request failures.
        }
      }
    };

    const pollTaskDeadlines = async () => {
      if (Notification.permission === "denied") return;

      const token = localStorage.getItem("eventsync_token");
      if (!token) return;

      if (Notification.permission === "default") {
        await requestNotificationPermission();
      }
      if (Notification.permission !== "granted") return;

      try {
        const response = await fetch(`${API_BASE_URL}/tasks`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const payload: TasksResponse = await response.json();
        if (!response.ok || !payload.success || !payload.tasks) return;

        payload.tasks
          .filter(isDueSoon)
          .forEach((task) => {
            const key = reminderKey(task);
            if (localStorage.getItem(key)) return;

            const dueDate = task.due_date ? new Date(task.due_date) : null;
            const hoursLeft = dueDate ? Math.max(1, Math.ceil((dueDate.getTime() - Date.now()) / 3600000)) : 0;

            new Notification("Task deadline reminder", {
              body: `${task.title} is due in ${hoursLeft} hour(s).`,
              tag: `task-reminder-${task.id}`,
            });

            localStorage.setItem(key, "1");
          });
      } catch {
        // Ignore polling failures and retry in the next cycle.
      }
    };

    void pollTaskDeadlines();
    const interval = window.setInterval(() => {
      void pollTaskDeadlines();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
