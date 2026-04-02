"use client";
import { useState } from "react";
import Link from "next/link";

const allTasks = {
  todo: [
    { id: 1, title: "Book AV equipment", assignee: "Omar", event: "Tech Gala", due: "Apr 10", priority: "high" },
    { id: 2, title: "Design event banner", assignee: "Unassigned", event: "Cultural Fest", due: "Apr 8", priority: "medium" },
    { id: 3, title: "Print attendee badges", assignee: "Sara", event: "Tech Gala", due: "Apr 12", priority: "low" },
  ],
  inProgress: [
    { id: 4, title: "Confirm venue deposit", assignee: "Alex", event: "Tech Gala", due: "Apr 7", priority: "high" },
    { id: 5, title: "Finalize speaker lineup", assignee: "Rania", event: "Tech Gala", due: "Apr 9", priority: "high" },
    { id: 6, title: "Set up registration form", assignee: "Omar", event: "Pitch Night", due: "Apr 11", priority: "medium" },
  ],
  done: [
    { id: 7, title: "Create event page", assignee: "Alex", event: "Tech Gala", due: "Apr 1", priority: "low" },
    { id: 8, title: "Send save-the-dates", assignee: "Rania", event: "Tech Gala", due: "Apr 2", priority: "low" },
    { id: 9, title: "Invite keynote speaker", assignee: "Alex", event: "Cultural Fest", due: "Apr 3", priority: "medium" },
  ],
};

const priorityColor: Record<string, string> = {
  high: "var(--overdue)",
  medium: "var(--at-risk)",
  low: "var(--text-3)",
};

export default function TasksPage() {
  const [selected, setSelected] = useState<number | null>(null);

  const selectedTask = [...allTasks.todo, ...allTasks.inProgress, ...allTasks.done].find(t => t.id === selected);

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-1)', marginBottom: 4 }}>Task Board</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>All tasks across your events</p>
        </div>
        <button className="btn-primary text-sm px-4 py-2.5">+ Add Task</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['All Tasks', 'My Tasks', 'By Member', 'By Deadline', 'At Risk'].map(f => (
          <button key={f} style={{ padding: '6px 14px', borderRadius: 99, border: '1px solid var(--border)', background: f === 'All Tasks' ? 'rgba(124,92,252,0.15)' : 'transparent', color: f === 'All Tasks' ? 'var(--accent)' : 'var(--text-2)', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer' }}>{f}</button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <select style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)', borderRadius: 8, padding: '6px 10px', fontSize: '0.75rem', cursor: 'pointer' }}>
            <option>Sort: Deadline</option>
            <option>Sort: Priority</option>
            <option>Sort: Assignee</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 320px' : '1fr', gap: 20 }}>
        {/* Kanban */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { col: "To Do", key: "todo" as const, color: "#a0a0c0" },
            { col: "In Progress", key: "inProgress" as const, color: "var(--at-risk)" },
            { col: "Done", key: "done" as const, color: "var(--on-track)" },
          ].map(({ col, key, color }) => (
            <div key={col} className="kanban-col" style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 99 }}>{allTasks[key].length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {allTasks[key].map(task => (
                  <div key={task.id} onClick={() => setSelected(task.id === selected ? null : task.id)} className="card" style={{ padding: '12px 14px', cursor: 'pointer', border: selected === task.id ? '1px solid var(--accent)' : '1px solid var(--border)', background: selected === task.id ? 'rgba(124,92,252,0.06)' : 'var(--surface)', transition: 'all 0.15s' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: priorityColor[task.priority], marginTop: 5, flexShrink: 0 }} />
                      <p style={{ fontSize: '0.85rem', fontWeight: 500, color: key === 'done' ? 'var(--text-3)' : 'var(--text-1)', margin: 0, textDecoration: key === 'done' ? 'line-through' : 'none' }}>{task.title}</p>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent-3))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 700, color: '#fff' }}>{task.assignee[0]}</div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{task.assignee}</span>
                      </div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>{task.due}</span>
                    </div>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: 6 }}>📅 {task.event}</p>
                  </div>
                ))}
                <button style={{ width: '100%', padding: '8px', background: 'none', border: '1px dashed var(--border)', borderRadius: 10, color: 'var(--text-3)', fontSize: '0.75rem', cursor: 'pointer' }}>+ Add task</button>
              </div>
            </div>
          ))}
        </div>

        {/* Task Detail Panel */}
        {selectedTask && (
          <div className="card" style={{ padding: 20, height: 'fit-content', position: 'sticky', top: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-1)' }}>Task Detail</h3>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>

            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-1)', marginBottom: 16, lineHeight: 1.3 }}>{selectedTask.title}</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: '0.8rem' }}>
              {[
                { label: "Event", value: selectedTask.event },
                { label: "Assignee", value: selectedTask.assignee },
                { label: "Due Date", value: selectedTask.due },
                { label: "Priority", value: selectedTask.priority },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-3)' }}>{r.label}</span>
                  <span style={{ color: 'var(--text-1)', fontWeight: 500, textTransform: 'capitalize' }}>{r.value}</span>
                </div>
              ))}

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Status</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {['Not Started', 'In Progress', 'Blocked', 'Done'].map(s => (
                    <button key={s} style={{ padding: '7px', borderRadius: 8, border: '1px solid var(--border)', background: s === 'In Progress' ? 'rgba(124,92,252,0.15)' : 'transparent', color: s === 'In Progress' ? 'var(--accent)' : 'var(--text-3)', fontSize: '0.72rem', fontWeight: 500, cursor: 'pointer' }}>{s}</button>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Sub-tasks</p>
                {['Confirm with vendor', 'Get receipt'].map(sub => (
                  <label key={sub} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-2)' }}>
                    <input type="checkbox" style={{ accentColor: 'var(--accent)' }} />
                    {sub}
                  </label>
                ))}
                <button style={{ fontSize: '0.75rem', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>+ Add sub-task</button>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Activity Log</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {['Created by AI from chat · Apr 5', 'Confirmed by Alex · Apr 5', 'Assigned to Alex · Apr 5'].map(a => (
                    <p key={a} style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: 0 }}>{a}</p>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Reminders</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={{ padding: '5px 10px', borderRadius: 99, border: '1px solid var(--border)', background: 'rgba(124,92,252,0.1)', color: 'var(--accent)', fontSize: '0.7rem', cursor: 'pointer' }}>24hr before ✓</button>
                  <button style={{ padding: '5px 10px', borderRadius: 99, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-3)', fontSize: '0.7rem', cursor: 'pointer' }}>2hr before</button>
                </div>
              </div>
            </div>

            <button className="btn-primary text-sm" style={{ width: '100%', marginTop: 16, padding: '10px' }}>Mark Complete ✓</button>
          </div>
        )}
      </div>
    </div>
  );
}
