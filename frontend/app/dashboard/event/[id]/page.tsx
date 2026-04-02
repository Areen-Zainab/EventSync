"use client";
import { useState } from "react";
import Link from "next/link";

const tabs = ["Overview", "Chat", "Tasks", "Members"];

function ScoreRing({ score }: { score: number }) {
  const r = 36, c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <svg width="90" height="90" viewBox="0 0 90 90">
      <circle cx="45" cy="45" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="7" />
      <circle cx="45" cy="45" r={r} fill="none" stroke="var(--accent-3)" strokeWidth="7"
        strokeDasharray={c} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 45 45)"
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
      <text x="45" y="50" textAnchor="middle" fill="var(--text-1)" fontSize="16" fontWeight="800" fontFamily="Syne, sans-serif">{score}</text>
    </svg>
  );
}

const chatMessages = [
  { sender: "Rania", msg: "We need to confirm the venue deposit by Friday!", time: "10:30am", mine: false },
  { sender: "You", msg: "On it, I'll call them today.", time: "10:31am", mine: true },
  { sender: "Omar", msg: "Also the AV team needs a headcount by Thursday. Who's handling that?", time: "10:45am", mine: false },
  { sender: "Rania", msg: "Assign it to me, I'll get numbers from registration.", time: "10:46am", mine: false },
  { sender: "You", msg: "Perfect. And can someone confirm the catering order by EOD?", time: "11:00am", mine: true },
];

const tasks = {
  todo: [
    { id: 1, title: "Book AV equipment", assignee: "Omar", due: "Apr 10" },
    { id: 2, title: "Design event banner", assignee: "Unassigned", due: "Apr 8" },
  ],
  inProgress: [
    { id: 3, title: "Confirm venue deposit", assignee: "Alex", due: "Apr 7" },
    { id: 4, title: "Finalize speaker lineup", assignee: "Rania", due: "Apr 9" },
  ],
  done: [
    { id: 5, title: "Create event page", assignee: "Alex", due: "Apr 1" },
    { id: 6, title: "Send save-the-dates", assignee: "Rania", due: "Apr 2" },
  ],
};

const members = [
  { name: "Alex Khan", role: "Organizer", tasks: 8, done: 5, online: true, initials: "AK" },
  { name: "Rania Mirza", role: "Coordinator", tasks: 6, done: 4, online: true, initials: "RM" },
  { name: "Omar Farooq", role: "Member", tasks: 4, done: 2, online: false, initials: "OF" },
  { name: "Sara Lee", role: "Member", tasks: 3, done: 3, online: false, initials: "SL" },
];

const extractedTasks = [
  { task: "Confirm venue deposit by Friday", assignee: "Alex", due: "Apr 7", confidence: "High", quote: "We need to confirm the venue deposit by Friday!" },
  { task: "Get headcount from registration by Thursday", assignee: "Rania", due: "Apr 6", confidence: "High", quote: "The AV team needs a headcount by Thursday" },
  { task: "Confirm catering order", assignee: "Unassigned", due: "Today", confidence: "Medium", quote: "Can someone confirm the catering order by EOD?" },
];

export default function EventOverviewPage() {
  const [tab, setTab] = useState("Overview");
  const [showExtraction, setShowExtraction] = useState(true);
  const [chatMsg, setChatMsg] = useState("");

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Event Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '18px 32px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <Link href="/dashboard/events" style={{ fontSize: '0.8rem', color: 'var(--text-3)', textDecoration: 'none' }}>Events</Link>
          <span style={{ color: 'var(--text-3)' }}>/</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Annual Tech Gala</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-1)', margin: 0 }}>Annual Tech Gala</h1>
            <span className="badge-on-track" style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99, textTransform: 'uppercase' }}>On Track</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-2)' }}>
            <span>📅 Apr 15, 2026</span>
            <span style={{ background: 'rgba(124,92,252,0.15)', color: 'var(--accent)', padding: '4px 12px', borderRadius: 99, fontWeight: 600, fontSize: '0.75rem' }}>13 days left</span>
            <button className="btn-ghost px-3 py-1.5 text-xs" style={{ padding: '6px 12px' }}>⚙ Edit Event</button>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 32px', display: 'flex', gap: 0, flexShrink: 0 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '12px 20px', fontSize: '0.875rem', fontWeight: 600, color: tab === t ? 'var(--accent)' : 'var(--text-2)', background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`, cursor: 'pointer', transition: 'color 0.15s' }}>{t}</button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {tab === "Overview" && (
          <div style={{ padding: '28px 32px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, maxWidth: 1100 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Risk alert */}
              <div style={{ background: 'rgba(255,179,71,0.08)', border: '1px solid rgba(255,179,71,0.3)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>⚠️</span>
                <p style={{ fontSize: '0.85rem', color: 'var(--at-risk)', margin: 0 }}>AI Alert: Vendor deposit deadline unconfirmed — 2 days remaining. <a href="#" style={{ color: 'var(--at-risk)', fontWeight: 600 }}>View task →</a></p>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {[
                  { label: "Tasks Done", value: "18/24", sub: "75% complete" },
                  { label: "Team Size", value: "8", sub: "4 online now" },
                  { label: "Days Left", value: "13", sub: "Apr 15, 2026" },
                ].map(s => (
                  <div key={s.label} className="card" style={{ padding: 18, textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-1)', marginBottom: 2 }}>{s.value}</p>
                    <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginTop: 2 }}>{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* Task progress */}
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                  <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-1)' }}>Task Progress</h3>
                  <Link href="#" onClick={() => setTab('Tasks')} style={{ fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none' }}>View board →</Link>
                </div>
                <div style={{ height: 8, background: 'var(--surface-3)', borderRadius: 99, marginBottom: 8 }}>
                  <div className="progress-fill" style={{ width: '75%', height: '100%' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-3)' }}>
                  <span>18 of 24 tasks completed</span>
                  <span>6 remaining</span>
                </div>
              </div>
            </div>

            {/* Stability score */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card" style={{ padding: 24, textAlign: 'center' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>Execution Stability</p>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                  <ScoreRing score={78} />
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', lineHeight: 1.5 }}>AI-generated score based on task completion rate, overdue items, and team activity.</p>
              </div>

              {/* Team roster */}
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-1)', marginBottom: 14 }}>Team Roster</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {members.map(m => (
                    <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent-3))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#fff' }}>{m.initials}</div>
                        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: m.online ? 'var(--on-track)' : 'var(--surface-3)', border: '2px solid var(--surface)' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-1)', margin: 0 }}>{m.name}</p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', margin: 0 }}>{m.role}</p>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{m.done}/{m.tasks}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "Chat" && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* AI extraction banner */}
            {showExtraction && (
              <div style={{ background: 'rgba(124,92,252,0.08)', border: '1px solid rgba(124,92,252,0.2)', borderBottom: '1px solid rgba(124,92,252,0.2)', padding: '14px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6 }}>🤖 AI extracted 3 tasks from recent messages</p>
                  <button onClick={() => setShowExtraction(false)} style={{ fontSize: '0.75rem', color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer' }}>Dismiss</button>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {extractedTasks.map((t, i) => (
                    <div key={i} className="task-chip">{t.task.slice(0, 30)}… <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>· {t.confidence}</span></div>
                  ))}
                  <button style={{ padding: '4px 12px', background: 'var(--accent)', color: '#fff', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Review All →</button>
                </div>
              </div>
            )}

            {/* Messages */}
            <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {chatMessages.map((m, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.mine ? 'flex-end' : 'flex-start', gap: 3 }}>
                  {!m.mine && <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', paddingLeft: 4 }}>{m.sender}</span>}
                  <div className={`chat-bubble ${m.mine ? 'mine' : 'theirs'}`}>{m.msg}</div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>{m.time} · Seen ✓</span>
                </div>
              ))}
            </div>

            {/* Input */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', gap: 10, alignItems: 'center' }}>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 18 }}>📎</button>
              <input className="input" style={{ flex: 1, borderRadius: 24 }} placeholder="Message #tech-gala... @mention someone" value={chatMsg} onChange={e => setChatMsg(e.target.value)} />
              <button className="btn-primary px-4 py-2 text-sm" style={{ flexShrink: 0 }}>Send</button>
            </div>
          </div>
        )}

        {tab === "Tasks" && (
          <div style={{ padding: '24px 32px' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {['My Tasks', 'By Member', 'By Deadline', 'At Risk'].map(f => (
                <button key={f} style={{ padding: '6px 14px', borderRadius: 99, border: '1px solid var(--border)', background: f === 'My Tasks' ? 'rgba(124,92,252,0.15)' : 'transparent', color: f === 'My Tasks' ? 'var(--accent)' : 'var(--text-2)', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer' }}>{f}</button>
              ))}
              <button className="btn-primary text-sm" style={{ marginLeft: 'auto', padding: '6px 16px' }}>+ Add Task</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                { col: "To Do", key: "todo" as const, color: "var(--text-3)" },
                { col: "In Progress", key: "inProgress" as const, color: "var(--at-risk)" },
                { col: "Done", key: "done" as const, color: "var(--on-track)" },
              ].map(({ col, key, color }) => (
                <div key={col} className="kanban-col" style={{ padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 99 }}>{tasks[key].length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {tasks[key].map(task => (
                      <div key={task.id} className="card card-hover" style={{ padding: '12px 14px', cursor: 'pointer' }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-1)', marginBottom: 8 }}>{task.title}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent-3))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: '#fff' }}>{task.assignee[0]}</div>
                          <span style={{ fontSize: '0.7rem', color: key === 'todo' ? 'var(--at-risk)' : 'var(--text-3)' }}>📅 {task.due}</span>
                        </div>
                      </div>
                    ))}
                    <button style={{ width: '100%', padding: '8px', background: 'none', border: '1px dashed var(--border)', borderRadius: 10, color: 'var(--text-3)', fontSize: '0.75rem', cursor: 'pointer' }}>+ Add task</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "Members" && (
          <div style={{ padding: '28px 32px', maxWidth: 700 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem', color: 'var(--text-1)' }}>Team Members ({members.length})</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-ghost text-sm" style={{ padding: '7px 14px' }}>Export CSV</button>
                <button className="btn-primary text-sm" style={{ padding: '7px 14px' }}>+ Invite</button>
              </div>
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
              {members.map((m, i) => (
                <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: i < members.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent-3))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>{m.initials}</div>
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: m.online ? 'var(--on-track)' : 'var(--surface-3)', border: '2px solid var(--surface)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-1)', margin: 0 }}>{m.name}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: 0 }}>{m.online ? 'Online now' : 'Last seen 2h ago'}</p>
                  </div>
                  <span style={{ fontSize: '0.75rem', background: 'rgba(124,92,252,0.12)', color: 'var(--accent)', padding: '4px 10px', borderRadius: 99, fontWeight: 600 }}>{m.role}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', width: 80, textAlign: 'center' }}>{m.done}/{m.tasks} tasks</span>
                  <button style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 14 }}>⋮</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
