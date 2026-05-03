"use client";

import { useEffect, useMemo, useState } from "react";

type FeedbackChoice = "liked" | "disliked" | "okay";

type UserAccount = {
  id: string;
  name?: string;
};

type FeedbackApiResponse = {
  success: boolean;
  message?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const choiceLabels: Array<{ value: FeedbackChoice; label: string }> = [
  { value: "liked", label: "👍 Yes, I liked it" },
  { value: "disliked", label: "👎 No, I didn’t like it" },
  { value: "okay", label: "😐 It was okay" },
];

const getApiBaseUrl = () => {
  const rawApiUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:5000";

  return rawApiUrl.replace(/\/$/, "").endsWith("/api")
    ? rawApiUrl.replace(/\/$/, "")
    : `${rawApiUrl.replace(/\/$/, "")}/api`;
};

export default function FeedbackPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [selected, setSelected] = useState<FeedbackChoice>("liked");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [activeUser, setActiveUser] = useState<UserAccount | null>(null);

  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const openFeedback = () => {
      const userRaw = localStorage.getItem("eventsync_user");
      if (!userRaw) return;

      try {
        const user = JSON.parse(userRaw) as UserAccount;
        if (user?.id) {
          setActiveUser(user);
          setIsVisible(true);
        }
      } catch {
        return;
      }
    };

    window.addEventListener("eventsync-open-feedback", openFeedback as EventListener);

    const userRaw = localStorage.getItem("eventsync_user");
    if (!userRaw) {
      return () => {
        window.removeEventListener("eventsync-open-feedback", openFeedback as EventListener);
      };
    }

    let user: UserAccount | null = null;
    try {
      user = JSON.parse(userRaw) as UserAccount;
    } catch {
      return () => {
        window.removeEventListener("eventsync-open-feedback", openFeedback as EventListener);
      };
    }

    if (!user?.id) {
      return () => {
        window.removeEventListener("eventsync-open-feedback", openFeedback as EventListener);
      };
    }

    setActiveUser(user);

    const now = Date.now();
    const nextAllowedRaw = localStorage.getItem(`eventsync_feedback_next_allowed_${user.id}`);
    const nextAllowed = nextAllowedRaw ? Number(nextAllowedRaw) : 0;
    if (Number.isFinite(nextAllowed) && nextAllowed > now) {
      return () => {
        window.removeEventListener("eventsync-open-feedback", openFeedback as EventListener);
      };
    }

    const promptAtRaw = localStorage.getItem(`eventsync_feedback_prompt_at_${user.id}`);
    const promptAt = promptAtRaw ? Number(promptAtRaw) : NaN;

    if (Number.isFinite(promptAt) && promptAt > now) {
      const delay = promptAt - now;
      const timer = window.setTimeout(() => {
        setIsVisible(true);
      }, delay);

      return () => {
        window.clearTimeout(timer);
        window.removeEventListener("eventsync-open-feedback", openFeedback as EventListener);
      };
    }

    if (Number.isFinite(promptAt) && promptAt <= now) {
      setIsVisible(true);
    }

    return () => {
      window.removeEventListener("eventsync-open-feedback", openFeedback as EventListener);
    };
  }, []);

  const suppressFor24Hours = (userId: string) => {
    const now = Date.now();
    localStorage.setItem(`eventsync_feedback_next_allowed_${userId}`, String(now + DAY_MS));
    localStorage.removeItem(`eventsync_feedback_login_at_${userId}`);
    localStorage.removeItem(`eventsync_feedback_prompt_at_${userId}`);
  };

  const handleMaybeLater = () => {
    if (!activeUser?.id) {
      setIsVisible(false);
      return;
    }

    suppressFor24Hours(activeUser.id);
    setIsVisible(false);
  };

  const handleSubmit = async () => {
    if (!activeUser?.id) return;

    const token = localStorage.getItem("eventsync_token");
    if (!token) {
      setError("Please log in again.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${apiBaseUrl}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          feedback: selected,
          comment: comment.trim() || undefined,
        }),
      });

      const result: FeedbackApiResponse = await response.json();
      if (!response.ok || !result.success) {
        setError(result.message || "Unable to submit feedback right now.");
        return;
      }

      suppressFor24Hours(activeUser.id);
      setIsVisible(false);
    } catch {
      setError("Unable to submit feedback right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isVisible || !activeUser) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        right: 18,
        bottom: 18,
        width: "min(420px, calc(100vw - 24px))",
        zIndex: 60,
      }}
      className="fade-up fade-up-2"
    >
      <div className="card" style={{ padding: 16, boxShadow: "0 10px 30px rgba(0,0,0,0.35)" }}>
        <p style={{ fontFamily: "Syne, sans-serif", fontSize: "1rem", fontWeight: 700, color: "var(--text-1)", marginBottom: 12 }}>
          Did you like using our system?
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {choiceLabels.map((item) => {
            const active = selected === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setSelected(item.value)}
                style={{
                  textAlign: "left",
                  borderRadius: 10,
                  border: active ? "1px solid rgba(124,92,252,0.5)" : "1px solid var(--border)",
                  background: active ? "rgba(124,92,252,0.14)" : "var(--surface-2)",
                  color: active ? "var(--text-1)" : "var(--text-2)",
                  padding: "10px 12px",
                  fontSize: "0.86rem",
                  transition: "all 0.15s",
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <textarea
          className="input"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Optional: tell us how we can improve"
          style={{ resize: "vertical", minHeight: 78 }}
        />

        {error && <p style={{ color: "var(--overdue)", fontSize: "0.78rem", marginTop: 8 }}>{error}</p>}

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{ flex: 1, fontSize: "0.84rem", padding: "9px 12px" }}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleMaybeLater}
            disabled={isSubmitting}
            style={{ fontSize: "0.84rem", padding: "9px 12px" }}
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
