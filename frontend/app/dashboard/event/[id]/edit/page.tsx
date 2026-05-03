"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type EventStatus = "on-track" | "at-risk" | "overdue";

type EventMember = {
  id?: string;
  user_id?: string;
  email: string | null;
  name: string;
  role: string;
  initials?: string;
};

type EventTaskSummary = {
  task_total: number;
  task_done: number;
  task_overdue: number;
  completion_rate: number;
  member_count: number;
  days_left: number | null;
};

type EventPayload = {
  id: string;
  name: string;
  description: string | null;
  date: string | null;
  venue: string | null;
  type: string | null;
  status: EventStatus;
  members: EventMember[];
  summary: EventTaskSummary;
  created_by_name?: string;
};

type ApiResponse = {
  success: boolean;
  event?: EventPayload;
  message?: string;
  member?: {
    id?: string;
    user_id?: string;
    email?: string | null;
    role?: string;
  };
};

type MemberDraft = {
  id?: string;
  user_id?: string;
  email: string;
  name: string;
  role: string;
  initials?: string;
  isNew: boolean;
  isRemoved: boolean;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";
const roles = ["Organizer", "Coordinator", "Member"];

export default function EditEventPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const eventId = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [venue, setVenue] = useState("");
  const [type, setType] = useState("Academic");
  const [members, setMembers] = useState<MemberDraft[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Array<{ event_id: string; user_id?: string | null; email?: string | null; role: string }>>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Member");

  const currentMembers = useMemo(() => members.filter((member) => !member.isRemoved), [members]);

  const loadEvent = async () => {
    if (!eventId) {
      setError("Invalid event id.");
      setLoading(false);
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("eventsync_token") : null;
    if (!token) {
      setError("Please log in again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data: ApiResponse = await response.json();
      if (!response.ok || !data.success || !data.event) {
        throw new Error(data.message || "Failed to load event details.");
      }

      const event = data.event;
      setName(event.name || "");
      setDescription(event.description || "");
      setDate(event.date ? event.date.slice(0, 10) : "");
      setVenue(event.venue || "");
      setType(event.type || "Academic");
      setMembers(
        (event.members || []).map((member) => ({
          id: member.id,
          user_id: member.user_id,
          email: member.email || "",
          name: member.name,
          role: member.role,
          initials: member.initials,
          isNew: false,
          isRemoved: false,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load event details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEvent();
  }, [eventId]);

  const addMemberRow = () => {
    setMembers((current) => [
      ...current,
      {
        email: inviteEmail.trim(),
        name: inviteEmail.trim() || "New member",
        role: inviteRole,
        isNew: true,
        isRemoved: false,
      },
    ]);
    setInviteEmail("");
    setInviteRole("Member");
  };

  const updateMember = (index: number, patch: Partial<MemberDraft>) => {
    setMembers((current) => current.map((member, memberIndex) => (memberIndex === index ? { ...member, ...patch } : member)));
  };

  const removeMember = (index: number) => {
    setMembers((current) =>
      current.map((member, memberIndex) => (memberIndex === index ? { ...member, isRemoved: true } : member))
    );
  };

  const saveEvent = async () => {
    if (!name.trim()) {
      setError("Event name is required.");
      return;
    }
    if (!date) {
      setError("Event date is required.");
      return;
    }
    if (!eventId) {
      setError("Invalid event id.");
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("eventsync_token") : null;
    if (!token) {
      setError("Please log in again.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const updateResponse = await fetch(`${API_BASE_URL}/events/${eventId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          date,
          venue: venue.trim() || null,
          type,
        }),
      });

      const updateData: ApiResponse = await updateResponse.json();
      if (!updateResponse.ok || !updateData.success) {
        throw new Error(updateData.message || "Failed to update event details.");
      }

      for (const member of members) {
        if (member.isRemoved) {
          if (member.user_id) {
            const response = await fetch(`${API_BASE_URL}/events/${eventId}/members/${member.user_id}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
            const payload: ApiResponse = await response.json();
            if (!response.ok || !payload.success) {
              throw new Error(payload.message || "Failed to remove a member.");
            }
          }
          continue;
        }

        if (member.isNew) {
          if (!member.email.trim()) continue;
          const response = await fetch(`${API_BASE_URL}/events/${eventId}/invite`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ email: member.email.trim(), role: member.role }),
          });
          const payload: ApiResponse = await response.json();
          if (!response.ok || !payload.success) {
            throw new Error(payload.message || `Failed to invite ${member.email}.`);
          }
          // Show immediate feedback that an invite was sent
          try {
            const invite = (payload as any).invite;
            if (invite) {
              setPendingInvites((p) => [...p, { event_id: invite.event_id, user_id: invite.user_id || null, email: invite.email || member.email, role: invite.role }]);
            }
          } catch (e) {
            // ignore
          }
          // remove the draft invite row from members
          setMembers((cur) => cur.filter((m) => m !== member));
          continue;
        }

        if (member.user_id) {
          const original = updateData.event?.members?.find((current) => current.user_id === member.user_id);
          if (original && original.role !== member.role) {
            const response = await fetch(`${API_BASE_URL}/events/${eventId}/members/${member.user_id}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ role: member.role }),
            });
            const payload: ApiResponse = await response.json();
            if (!response.ok || !payload.success) {
              throw new Error(payload.message || `Failed to update role for ${member.name}.`);
            }
          }
        }
      }

      setSuccess("Event updated successfully.");
      await loadEvent();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save event.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "28px 32px", color: "var(--text-3)" }}>Loading editor...</div>;
  }

  const visibleMembers = members
    .map((member, index) => ({ member, index }))
    .filter(({ member }) => !member.isRemoved);

  return (
    <div style={{ padding: "32px 36px", maxWidth: 980 }}>
      <Link href={`/dashboard/event/${eventId}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: "var(--text-2)", textDecoration: "none", marginBottom: 24 }}>
        ← Back to Event
      </Link>

      <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: "1.5rem", fontWeight: 800, color: "var(--text-1)", marginBottom: 6 }}>
        Edit Event
      </h1>
      <p style={{ fontSize: "0.875rem", color: "var(--text-2)", marginBottom: 24 }}>
        Update details, manage members, and change permissions.
      </p>

      {error && <p style={{ marginBottom: 16, color: "var(--overdue)", fontSize: "0.85rem", fontWeight: 600 }}>{error}</p>}
      {success && <p style={{ marginBottom: 16, color: "var(--on-track)", fontSize: "0.85rem", fontWeight: 600 }}>{success}</p>}

      <div className="card" style={{ padding: 24, display: "grid", gap: 24 }}>
        <section style={{ display: "grid", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Event Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Description</label>
            <textarea className="input" rows={4} style={{ resize: "vertical" }} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Date</label>
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Venue</label>
              <input className="input" value={venue} onChange={(e) => setVenue(e.target.value)} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Type</label>
              <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
                {['Academic', 'Social', 'Sports', 'Cultural'].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <p style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, color: "var(--text-1)", marginBottom: 4 }}>Members & Permissions</p>
              <p style={{ fontSize: "0.8rem", color: "var(--text-2)" }}>Edit current roles, remove members, or invite new people.</p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr auto", gap: 10, alignItems: "center" }}>
            <input className="input" placeholder="invitee@university.edu" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            <select className="input" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
              {roles.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            <button type="button" onClick={addMemberRow} className="btn-primary" style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>
              Add Member
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visibleMembers.map(({ member, index }) => (
              <div key={member.user_id || member.email || index} className="card" style={{ padding: 14, display: "grid", gridTemplateColumns: "auto 1fr 180px auto", gap: 12, alignItems: "center" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), var(--accent-3))", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.8rem" }}>
                  {(member.initials || member.name?.slice(0, 2) || "M").toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, color: "var(--text-1)" }}>{member.name || member.email || "Unnamed member"}</p>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-3)" }}>{member.email || "No email available"}</p>
                </div>
                <select className="input" value={member.role} onChange={(e) => updateMember(index, { role: e.target.value })}>
                  {roles.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
                <button type="button" className="btn-ghost" style={{ padding: "8px 12px" }} onClick={() => removeMember(index)}>
                  Remove
                </button>
              </div>
            ))}
            {pendingInvites.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <p style={{ margin: '8px 0', fontWeight: 700, color: 'var(--text-1)' }}>Pending Invites</p>
                {pendingInvites.map((inv, i) => (
                  <div key={`${inv.email || inv.user_id}-${i}`} className="card" style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600 }}>{inv.email || 'Invited user'}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-3)' }}>{inv.role} · Invite sent</p>
                    </div>
                    <div style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Pending</div>
                  </div>
                ))}
              </div>
            )}
            {visibleMembers.length === 0 && (
              <div className="card" style={{ padding: 16, borderStyle: "dashed" }}>
                <p style={{ margin: 0, color: "var(--text-3)", fontSize: "0.85rem" }}>No members have been added yet.</p>
              </div>
            )}
          </div>
        </section>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <Link href={`/dashboard/event/${eventId}`} className="btn-ghost" style={{ padding: "10px 16px", textDecoration: "none" }}>
            Cancel
          </Link>
          <button type="button" className="btn-primary" onClick={saveEvent} disabled={saving} style={{ padding: "10px 16px", opacity: saving ? 0.75 : 1, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
