"use client";
import { useState } from "react";

const eventRooms = [
  { id: 1, name: "Annual Tech Gala", unread: 3, lastMsg: "Can someone confirm AV?" },
  { id: 2, name: "Spring Cultural Fest", unread: 0, lastMsg: "Stage design approved ✓" },
  { id: 3, name: "Startup Pitch Night", unread: 7, lastMsg: "Catering order needed!" },
];

const messages: Record<number, { sender: string; msg: string; time: string; mine: boolean }[]> = {
  1: [
    { sender: "Rania", msg: "We need to confirm the venue deposit by Friday!", time: "10:30am", mine: false },
    { sender: "You", msg: "On it, I'll call them today.", time: "10:31am", mine: true },
    { sender: "Omar", msg: "Also the AV team needs a headcount by Thursday. Who's handling that?", time: "10:45am", mine: false },
    { sender: "Rania", msg: "Assign it to me, I'll get numbers from registration.", time: "10:46am", mine: false },
    { sender: "You", msg: "Perfect. And can someone confirm the catering order by EOD?", time: "11:00am", mine: true },
  ],
  2: [
    { sender: "Sara", msg: "Stage design has been approved by the committee 🎉", time: "9:15am", mine: false },
    { sender: "You", msg: "Great news! Who's handling the backdrop setup?", time: "9:20am", mine: true },
    { sender: "Sara", msg: "Bilal and I will handle it the day before.", time: "9:22am", mine: false },
  ],
  3: [
    { sender: "Bilal", msg: "We still haven't placed the catering order!", time: "8:00am", mine: false },
    { sender: "You", msg: "I know, let me reach out to the vendor now.", time: "8:05am", mine: true },
    { sender: "Bilal", msg: "Also need a headcount — are we at 80 or 100 attendees?", time: "8:10am", mine: false },
    { sender: "Rania", msg: "Registration says 87 confirmed.", time: "8:12am", mine: false },
    { sender: "You", msg: "Order for 100 to be safe.", time: "8:15am", mine: true },
  ],
};

const extractedTasks: Record<number, { task: string; assignee: string; due: string; confidence: string }[]> = {
  1: [
    { task: "Confirm venue deposit by Friday", assignee: "Alex", due: "Apr 7", confidence: "High" },
    { task: "Get headcount from registration by Thursday", assignee: "Rania", due: "Apr 6", confidence: "High" },
    { task: "Confirm catering order", assignee: "Unassigned", due: "Today", confidence: "Medium" },
  ],
  3: [
    { task: "Place catering order", assignee: "Alex", due: "Today", confidence: "High" },
    { task: "Confirm final headcount", assignee: "Rania", due: "Today", confidence: "High" },
  ],
};

const confidenceColor: Record<string, string> = {
  High: "var(--on-track)",
  Medium: "var(--at-risk)",
  Review: "var(--overdue)",
};

export default function ChatPage() {
  const [activeRoom, setActiveRoom] = useState(1);
  const [chatMsg, setChatMsg] = useState("");
  const [showExtraction, setShowExtraction] = useState(true);
  const [reviewMode, setReviewMode] = useState(false);
  const [dismissed, setDismissed] = useState<number[]>([]);
  const [confirmed, setConfirmed] = useState<number[]>([]);

  const tasks = extractedTasks[activeRoom] || [];
  const hasTasks = tasks.length > 0;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Room list */}
      <div style={{ width: 240, borderRight: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px 16px 10px' }}>
          <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-1)' }}>Event Rooms</p>
        </div>
        {eventRooms.map(room => (
          <button key={room.id} onClick={() => { setActiveRoom(room.id); setShowExtraction(true); setReviewMode(false); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: activeRoom === room.id ? 'rgba(124,92,252,0.1)' : 'transparent', border: 'none', borderLeft: `2px solid ${activeRoom === room.id ? 'var(--accent)' : 'transparent'}`, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: activeRoom === room.id ? 'var(--accent)' : 'var(--text-1)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.name}</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.lastMsg}</p>
            </div>
            {room.unread > 0 && <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 99, fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', flexShrink: 0 }}>{room.unread}</span>}
          </button>
        ))}
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-1)', margin: 0 }}>#{eventRooms.find(r => r.id === activeRoom)?.name}</p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', margin: 0 }}>4 members · Event coordination chat</p>
          </div>
          <button style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 18 }}>📌</button>
        </div>

        {/* AI extraction banner */}
        {hasTasks && showExtraction && !reviewMode && (
          <div style={{ background: 'rgba(124,92,252,0.07)', borderBottom: '1px solid rgba(124,92,252,0.2)', padding: '12px 20px', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--accent)', margin: 0 }}>🤖 AI extracted {tasks.length} tasks from recent messages</p>
              <button onClick={() => setShowExtraction(false)} style={{ fontSize: '0.75rem', color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {tasks.map((t, i) => (
                <span key={i} className="task-chip">{t.task.slice(0, 28)}…</span>
              ))}
              <button onClick={() => setReviewMode(true)} style={{ padding: '4px 14px', background: 'var(--accent)', color: '#fff', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Review All →</button>
            </div>
          </div>
        )}

        {/* Review mode */}
        {reviewMode && (
          <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '16px 20px', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-1)', margin: 0 }}>🤖 AI Task Extraction Review</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setConfirmed(tasks.map((_, i) => i))} style={{ fontSize: '0.75rem', background: 'rgba(0,212,170,0.15)', color: 'var(--on-track)', border: '1px solid rgba(0,212,170,0.3)', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontWeight: 600 }}>Confirm All</button>
                <button onClick={() => setReviewMode(false)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 18 }}>✕</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tasks.map((t, i) => (
                <div key={i} style={{ padding: '12px 14px', background: dismissed.includes(i) ? 'var(--surface-3)' : confirmed.includes(i) ? 'rgba(0,212,170,0.06)' : 'var(--surface-2)', borderRadius: 10, border: `1px solid ${confirmed.includes(i) ? 'rgba(0,212,170,0.3)' : dismissed.includes(i) ? 'var(--border)' : 'var(--border)'}`, opacity: dismissed.includes(i) ? 0.5 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-1)', margin: 0, marginBottom: 6 }}>{t.task}</p>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', margin: 0, fontStyle: 'italic' }}>"…from message at {['10:30am', '10:45am', '11:00am'][i]}"</p>
                      <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: '0.75rem', color: 'var(--text-2)' }}>
                        <span>👤 {t.assignee}</span>
                        <span>📅 {t.due}</span>
                        <span style={{ color: confidenceColor[t.confidence] }}>● {t.confidence}</span>
                      </div>
                    </div>
                    {!dismissed.includes(i) && !confirmed.includes(i) && (
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => setConfirmed(c => [...c, i])} style={{ fontSize: '0.72rem', background: 'rgba(0,212,170,0.12)', color: 'var(--on-track)', border: '1px solid rgba(0,212,170,0.3)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>✓ Confirm</button>
                        <button onClick={() => setDismissed(d => [...d, i])} style={{ fontSize: '0.72rem', background: 'rgba(255,107,107,0.08)', color: 'var(--overdue)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>✕ Dismiss</button>
                      </div>
                    )}
                    {confirmed.includes(i) && <span style={{ fontSize: '0.75rem', color: 'var(--on-track)', fontWeight: 600, flexShrink: 0 }}>✓ Added to board</span>}
                    {dismissed.includes(i) && <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', flexShrink: 0 }}>Dismissed</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {(messages[activeRoom] || []).map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.mine ? 'flex-end' : 'flex-start', gap: 3 }}>
              {!m.mine && <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', paddingLeft: 4 }}>{m.sender}</span>}
              <div className={`chat-bubble ${m.mine ? 'mine' : 'theirs'}`}>{m.msg}</div>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>{m.time} {m.mine && '· Seen ✓'}</span>
            </div>
          ))}
        </div>

        {/* Input */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          <button style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 18 }}>📎</button>
          <input className="input" style={{ flex: 1, borderRadius: 24 }} placeholder="Message this room... use @name to mention" value={chatMsg} onChange={e => setChatMsg(e.target.value)} />
          <button className="btn-primary px-4 py-2 text-sm" style={{ flexShrink: 0 }}>Send</button>
        </div>
      </div>
    </div>
  );
}
