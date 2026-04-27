"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const eventTypes = ["Academic", "Social", "Sports", "Cultural"];
const roles = ["Organizer", "Coordinator", "Member"];
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

type PlanSnapshot = {
  name: "free" | "plus" | "premium";
  event_limit: number | null;
  member_limit: number | null;
  events_left: number | null;
};

type DashboardPlanResponse = {
  success: boolean;
  dashboard?: {
    plan?: PlanSnapshot;
  };
};

export default function NewEventPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [type, setType] = useState("Academic");
  const [members, setMembers] = useState([{ email: "", role: "Member" }]);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [venue, setVenue] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [planInfo, setPlanInfo] = useState<PlanSnapshot | null>(null);

  const eventCreationBlocked =
    planInfo !== null &&
    planInfo.event_limit !== null &&
    planInfo.events_left !== null &&
    planInfo.events_left <= 0;

  const formatPlanLabel = (plan?: string) => {
    if (plan === "plus") return "Plus";
    if (plan === "premium") return "Premium";
    return "Free";
  };

  useEffect(() => {
    const loadPlan = async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("eventsync_token") : null;
      if (!token) return;

      try {
        const response = await fetch(`${API_BASE_URL}/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result: DashboardPlanResponse = await response.json();
        if (!response.ok || !result.success || !result.dashboard?.plan) return;
        setPlanInfo(result.dashboard.plan);
      } catch {
        // Ignore non-blocking plan snapshot fetch errors.
      }
    };

    void loadPlan();
  }, []);

  const addMember = () => setMembers(m => [...m, { email: "", role: "Member" }]);

  const goToNextStep = () => {
    if (step === 1) {
      if (!name.trim()) {
        setError("Event name is required.");
        return;
      }
      if (!date) {
        setError("Event date is required.");
        return;
      }
    }

    setError("");
    setStep(s => Math.min(3, s + 1));
  };

  const createEvent = async () => {
    if (!name.trim() || !date) {
      setError("Please complete event details before creating.");
      setStep(1);
      return;
    }

    if (eventCreationBlocked) {
      setError("Your current plan reached its event limit. Upgrade to create more events.");
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("eventsync_token") : null;
    if (!token) {
      setError("Please log in again to create an event.");
      return;
    }

    const cleanedMembers = members
      .map((member) => ({ email: member.email.trim(), role: member.role }))
      .filter((member) => member.email.length > 0);

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          date,
          venue: venue.trim() || null,
          type,
          description: description.trim() || null,
          members: cleanedMembers,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to create event.");
      }

      const eventId = data.event?.id;
      if (eventId) {
        router.push(`/dashboard/event/${eventId}`);
        return;
      }

      router.push("/dashboard/events");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '32px 36px', maxWidth: 680 }}>
      {/* Back */}
      <Link href="/dashboard/events" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-2)', textDecoration: 'none', marginBottom: 24 }}>← Back to Events</Link>

      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-1)', marginBottom: 6 }}>Create New Event</h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', marginBottom: 32 }}>Fill in the details to kick off your event workspace.</p>
      {planInfo && (
        <div style={{ marginBottom: 16, background: 'var(--surface-2)', borderRadius: 10, padding: 12, border: '1px solid var(--border)' }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-2)' }}>
            Plan: <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{formatPlanLabel(planInfo.name)}</span>
            {planInfo.event_limit !== null && planInfo.events_left !== null ? ` - ${planInfo.events_left} event slot(s) left` : ' - Unlimited events'}
          </p>
          <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: 'var(--text-3)' }}>
            Member limit per event: {planInfo.member_limit === null ? 'Unlimited' : planInfo.member_limit}
          </p>
        </div>
      )}
      {error && <p style={{ marginBottom: 16, color: 'var(--overdue)', fontSize: '0.825rem', fontWeight: 600 }}>{error}</p>}

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 32 }}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: s <= step ? 'var(--accent)' : 'var(--surface-3)', color: s <= step ? '#fff' : 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>{s}</div>
            <span style={{ fontSize: '0.8rem', color: s === step ? 'var(--text-1)' : 'var(--text-3)', fontWeight: s === step ? 600 : 400 }}>
              {s === 1 ? 'Details' : s === 2 ? 'Team' : 'Review'}
            </span>
            {s < 3 && <div style={{ width: 32, height: 1, background: 'var(--border)' }} />}
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 28 }}>
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}>Event Name *</label>
              <input className="input" placeholder="e.g. Annual Tech Symposium 2026" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}>Date *</label>
                <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}>Venue</label>
                <input className="input" placeholder="e.g. Main Auditorium" value={venue} onChange={(e) => setVenue(e.target.value)} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-2)', marginBottom: 8 }}>Event Type</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {eventTypes.map(t => (
                  <button key={t} onClick={() => setType(t)} style={{ padding: '8px 16px', borderRadius: 99, border: `1px solid ${type === t ? 'var(--accent)' : 'var(--border)'}`, background: type === t ? 'rgba(124,92,252,0.15)' : 'transparent', color: type === t ? 'var(--accent)' : 'var(--text-2)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}>Description</label>
              <textarea className="input" placeholder="What's this event about?" rows={3} style={{ resize: 'vertical' }} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>Invite Team Members</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>
                Add by email or share the invite link after creating.
                {planInfo?.member_limit !== null ? ` This plan allows up to ${planInfo?.member_limit} members per event.` : ' This plan allows unlimited members per event.'}
              </p>
            </div>
            {members.map((m, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}>
                <input className="input" placeholder="teammate@university.edu" value={m.email} onChange={e => { const arr = [...members]; arr[i].email = e.target.value; setMembers(arr); }} />
                <select value={m.role} onChange={e => { const arr = [...members]; arr[i].role = e.target.value; setMembers(arr); }} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-1)', borderRadius: 10, padding: '10px 12px', fontSize: '0.875rem', cursor: 'pointer' }}>
                  {roles.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={addMember} className="btn-ghost py-2 text-sm" style={{ alignSelf: 'flex-start', padding: '8px 16px' }}>+ Add another</button>
              <button onClick={() => setStep(3)} className="btn-ghost py-2 text-sm" style={{ alignSelf: 'flex-start', padding: '8px 16px' }}>Skip for now</button>
            </div>

            <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 14, border: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: 8 }}>Or share invite link</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" value="https://eventsync.app/join/abc123" readOnly style={{ flex: 1, background: 'var(--surface-3)', cursor: 'default' }} />
                <button className="btn-ghost py-2 px-4 text-sm" style={{ flexShrink: 0 }}>Copy</button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>Review & Create</p>
            {[
              { label: 'Event Name', value: name || '-' },
              { label: 'Date', value: date ? new Date(date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : '-' },
              { label: 'Venue', value: venue || '-' },
              { label: 'Type', value: type },
              { label: 'Team', value: `${members.filter((member) => member.email.trim()).length} member(s) invited` },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{r.label}</span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-1)', fontWeight: 500 }}>{r.value}</span>
              </div>
            ))}
            <div style={{ background: 'rgba(124,92,252,0.08)', border: '1px solid rgba(124,92,252,0.2)', borderRadius: 10, padding: 14 }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>🔒 Data privacy notice: All event data is encrypted at rest (AES-256) and only accessible to invited members.</p>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
          <button onClick={() => setStep(s => Math.max(1, s - 1))} className="btn-ghost py-2.5 px-5 text-sm" style={{ visibility: step > 1 ? 'visible' : 'hidden' }}>← Back</button>
          <button onClick={step === 3 ? createEvent : goToNextStep} className="btn-primary py-2.5 px-6 text-sm" disabled={isSubmitting || eventCreationBlocked} style={{ opacity: isSubmitting || eventCreationBlocked ? 0.7 : 1, cursor: isSubmitting || eventCreationBlocked ? 'not-allowed' : 'pointer' }}>
            {step === 3 ? (isSubmitting ? 'Creating...' : '🚀 Create Event') : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  );
}
