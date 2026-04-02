"use client";
import { useState } from "react";

const members = [
  { name: "Alex Khan", email: "alex@uni.edu", role: "Organizer", events: 3, tasks: 18, done: 14, online: true, initials: "AK", lastActive: "Now" },
  { name: "Rania Mirza", email: "rania@uni.edu", role: "Coordinator", events: 2, tasks: 12, done: 9, online: true, initials: "RM", lastActive: "5 min ago" },
  { name: "Omar Farooq", email: "omar@uni.edu", role: "Member", events: 2, tasks: 8, done: 5, online: false, initials: "OF", lastActive: "2 hr ago" },
  { name: "Sara Lee", email: "sara@uni.edu", role: "Member", events: 1, tasks: 4, done: 4, online: false, initials: "SL", lastActive: "Yesterday" },
  { name: "Bilal Ahmed", email: "bilal@uni.edu", role: "Member", events: 1, tasks: 3, done: 1, online: false, initials: "BA", lastActive: "3 days ago" },
];

export default function TeamPage() {
  const [showInvite, setShowInvite] = useState(false);

  return (
    <div style={{ padding: '32px 36px', maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-1)', marginBottom: 4 }}>Team Members</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>{members.length} members across all your events</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-ghost text-sm" style={{ padding: '8px 16px' }}>Export CSV</button>
          <button onClick={() => setShowInvite(!showInvite)} className="btn-primary text-sm" style={{ padding: '8px 16px' }}>+ Invite Member</button>
        </div>
      </div>

      {/* Invite panel */}
      {showInvite && (
        <div className="card" style={{ padding: 20, marginBottom: 20, border: '1px solid rgba(124,92,252,0.3)' }}>
          <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--text-1)', marginBottom: 14 }}>Invite a Team Member</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10 }}>
            <input className="input" placeholder="teammate@university.edu" />
            <select style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-1)', borderRadius: 10, padding: '10px 12px', fontSize: '0.875rem', cursor: 'pointer' }}>
              {['Member', 'Coordinator', 'Organizer'].map(r => <option key={r}>{r}</option>)}
            </select>
            <button className="btn-primary text-sm" style={{ padding: '10px 18px' }}>Send Invite</button>
          </div>
        </div>
      )}

      {/* Member table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--border)', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          <span>Member</span>
          <span>Role</span>
          <span>Tasks</span>
          <span>Last Active</span>
          <span></span>
        </div>
        {members.map((m, i) => (
          <div key={m.name} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px', gap: 12, padding: '14px 20px', borderBottom: i < members.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent-3))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>{m.initials}</div>
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderRadius: '50%', background: m.online ? 'var(--on-track)' : 'var(--surface-3)', border: '2px solid var(--surface)' }} />
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-1)', margin: 0 }}>{m.name}</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', margin: 0 }}>{m.email}</p>
              </div>
            </div>
            <span style={{ fontSize: '0.75rem', background: m.role === 'Organizer' ? 'rgba(124,92,252,0.12)' : m.role === 'Coordinator' ? 'rgba(0,212,170,0.1)' : 'var(--surface-2)', color: m.role === 'Organizer' ? 'var(--accent)' : m.role === 'Coordinator' ? 'var(--on-track)' : 'var(--text-2)', padding: '4px 10px', borderRadius: 99, fontWeight: 600, display: 'inline-block' }}>{m.role}</span>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-1)', margin: 0 }}>{m.done}/{m.tasks} done</p>
              <div style={{ marginTop: 4, height: 3, background: 'var(--surface-3)', borderRadius: 99, width: 60 }}>
                <div style={{ height: '100%', width: `${(m.done / m.tasks) * 100}%`, background: 'var(--accent)', borderRadius: 99 }} />
              </div>
            </div>
            <span style={{ fontSize: '0.75rem', color: m.online ? 'var(--on-track)' : 'var(--text-3)' }}>{m.lastActive}</span>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '0.75rem', padding: '4px 8px', borderRadius: 6 }}>Edit</button>
              <button style={{ background: 'none', border: 'none', color: 'var(--overdue)', cursor: 'pointer', fontSize: '0.75rem', padding: '4px 8px', borderRadius: 6 }}>Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
