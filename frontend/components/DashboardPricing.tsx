"use client";

import { useEffect, useState } from "react";
import CardDetailsModal from "@/components/CardDetailsModal";
import { PRICING_PLANS, type PlanName } from "@/lib/pricingPlans";

const rawApiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const API_BASE_URL = rawApiUrl.replace(/\/$/, "").endsWith("/api") ? rawApiUrl.replace(/\/$/, "") : `${rawApiUrl.replace(/\/$/, "")}/api`;

const toBackendPlan = (plan: PlanName): "free" | "plus" | "premium" => {
  if (plan === "Plus") return "plus";
  if (plan === "Premium") return "premium";
  return "free";
};

const fromBackendPlan = (plan: string | undefined): PlanName => {
  if (plan === "plus") return "Plus";
  if (plan === "premium") return "Premium";
  return "Free";
};

export default function DashboardPricing() {
  const [currentPlan, setCurrentPlan] = useState<PlanName>("Free");
  const [pendingPlan, setPendingPlan] = useState<PlanName | null>(null);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadPlan = async () => {
      const storedPlan = typeof window !== "undefined" ? localStorage.getItem("eventsync_plan") : null;
      if (storedPlan === "Free" || storedPlan === "Plus" || storedPlan === "Premium") {
        setCurrentPlan(storedPlan);
      }

      const token = typeof window !== "undefined" ? localStorage.getItem("eventsync_token") : null;
      if (!token) return;

      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();
        if (!response.ok || !result?.success || !result?.user) return;

        const planName = fromBackendPlan(result.user.plan);
        setCurrentPlan(planName);
        localStorage.setItem("eventsync_plan", planName);
      } catch {
        // Ignore best-effort plan sync errors here.
      }
    };

    void loadPlan();
  }, []);

  const choosePlan = async (plan: PlanName) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("eventsync_token") : null;
    if (!token) {
      setError("Please log in again to update your plan.");
      return;
    }

    setError("");
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ plan: toBackendPlan(plan) }),
    });

    const result = await response.json();
    if (!response.ok || !result?.success) {
      setError(result?.message || "Failed to update plan.");
      return;
    }

    const syncedPlan = fromBackendPlan(result?.user?.plan);
    setCurrentPlan(syncedPlan);
    localStorage.setItem("eventsync_plan", syncedPlan);
    window.dispatchEvent(new Event("eventsync-plan-updated"));
  };

  const handlePlanAction = (plan: PlanName) => {
    if (plan === "Free") {
      choosePlan(plan);
      return;
    }

    setPendingPlan(plan);
    setCardModalOpen(true);
  };

  const closeCardModal = () => {
    setCardModalOpen(false);
    setPendingPlan(null);
  };

  const confirmCardDetails = () => {
    if (!pendingPlan) return;
    void choosePlan(pendingPlan);
    closeCardModal();
  };

  return (
    <div style={{ padding: "32px 36px 56px", maxWidth: 1240 }}>
      <div className="fade-up fade-up-1" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: "1.75rem", fontWeight: 800, color: "var(--text-1)", marginBottom: 6 }}>
            Pricing Plans
          </h1>
          <p style={{ color: "var(--text-2)", fontSize: "0.92rem", maxWidth: 720 }}>
            Compare plans and update your in-app plan without leaving the dashboard.
          </p>
        </div>

        <div style={{ padding: "12px 14px", borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)", minWidth: 220 }}>
          <p style={{ fontSize: "0.72rem", color: "var(--text-3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
            Current Plan
          </p>
          <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-1)", margin: 0 }}>{currentPlan}</p>
        </div>
      </div>

      {error && <p style={{ marginTop: 8, color: "var(--overdue)", fontSize: "0.82rem" }}>{error}</p>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {PRICING_PLANS.map((plan) => {
          const isActive = currentPlan === plan.name;

          return (
            <div
              key={plan.name}
              className="card fade-up fade-up-2"
              style={{
                padding: 24,
                position: "relative",
                border: plan.highlight ? "1px solid rgba(124,92,252,0.5)" : undefined,
                boxShadow: isActive ? "0 0 0 1px rgba(0,212,170,0.18) inset" : undefined,
              }}
            >
              {plan.highlight && (
                <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "var(--accent)", color: "#fff", fontSize: "0.7rem", fontWeight: 700, padding: "3px 12px", borderRadius: 999, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Most Popular
                </div>
              )}

              <div style={{ marginBottom: 18 }}>
                <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{plan.name}</p>
                <div className="flex items-baseline gap-1">
                  <span style={{ fontFamily: "Syne, sans-serif", fontSize: "2rem", fontWeight: 800, color: "var(--text-1)" }}>{plan.price}</span>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>/ {plan.period}</span>
                </div>
                <p style={{ fontSize: "0.8rem", color: "var(--text-2)", marginTop: 6 }}>Best for: {plan.bestFor}</p>
              </div>

              <ul className="flex flex-col gap-2 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} style={{ fontSize: "0.875rem", color: "var(--text-2)", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "var(--accent-3)", fontSize: "0.7rem" }}>✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className={isActive ? "btn-primary py-2.5 text-sm" : "btn-ghost py-2.5 text-sm"}
                style={{ width: "100%" }}
                onClick={() => void handlePlanAction(plan.name)}
              >
                {isActive ? "Current Plan" : `Switch to ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      <CardDetailsModal
        open={cardModalOpen}
        planName={pendingPlan}
        onClose={closeCardModal}
        onConfirm={confirmCardDetails}
      />
    </div>
  );
}