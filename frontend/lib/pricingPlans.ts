export type PlanName = "Free" | "Plus" | "Premium";

export type PricingPlan = {
  name: PlanName;
  price: string;
  period: string;
  bestFor: string;
  features: string[];
  highlight?: boolean;
};

export const PRICING_PLANS: PricingPlan[] = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    bestFor: "Students, small test teams",
    features: [
      "1 active event",
      "Up to 5 members",
      "Basic chat",
      "Manual task board",
      "Limited AI extraction (30 AI tasks/month)",
      "Basic reminders",
      "7-day activity history",
    ],
  },
  {
    name: "Plus",
    price: "$19-29",
    period: "month per workspace",
    bestFor: "Growing event teams",
    features: [
      "Up to 10 active events",
      "Up to 25 members",
      "Unlimited chat",
      "Higher AI quota (500 AI tasks/month)",
      "Priority/deadline smart notifications",
      "Task filters/views",
      "Export (CSV)",
      "90-day history",
      "Email support",
    ],
    highlight: true,
  },
  {
    name: "Premium",
    price: "$79-149",
    period: "month per workspace",
    bestFor: "Agencies, university orgs, companies",
    features: [
      "Unlimited events/members",
      "Advanced AI quota (fair use)",
      "Automation rules (auto-assign, escalation)",
      "Role-based access control",
      "Audit logs",
      "Analytics dashboard",
      "Custom reminders",
      "Dedicated onboarding",
    ],
  },
];