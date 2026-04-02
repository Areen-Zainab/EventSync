"use client";
import { useState } from "react";

export default function SettingsPage() {
  const [notifs, setNotifs] = useState({ taskReminders: true, aiAlerts: true, teamUpdates: false, quietHours: true });
  const [activeTab, setActiveTab] = useState("Profile");

  return (
    <div style={{ padding: '32px 36px', maxWidth: 700 }}>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-1)', marginBottom: 28 }}>Settings</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {['Profile', 'Notifications', 'Privacy', 'Account'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{ padding: '10px 18px', background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === t ? 'var(--accent)' : 'transparent'}`, color: activeTab === t ? 'var(--accent)' : 'var(--text-2)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', transition: 'color 0.15s', marginBottom: -1 }}>{t}</button>
        ))}
      </div>

      {activeTab === "Profile" && (
        <div className="card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent-3))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>A</div>
            <div>
              <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem', color: 'var(--text-1)', marginBottom: 4 }}>Alex Khan</p>
              <button style={{ fontSize: '0.75rem', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Change avatar</button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {[{ label: 'Full Name', value: 'Alex Khan' }, { label: 'Email', value: 'alex@university.edu' }].map(f => (
              <div key={f.label}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}>{f.label}</label>
                <input className="input" defaultValue={f.value} />
              </div>
            ))}
            <button className="btn-primary text-sm" style={{ alignSelf: 'flex-start', padding: '10px 22px' }}>Save Changes</button>
          </div>
        </div>
      )}

      {activeTab === "Notifications" && (
        <div className="card" style={{ padding: 24 }}>
          <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-1)', marginBottom: 20 }}>Notification Preferences</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { key: 'taskReminders' as const, label: 'Task Reminders', desc: 'Get notified before task deadlines' },
              { key: 'aiAlerts' as const, label: 'AI Alerts', desc: 'Risk alerts and task extraction notifications' },
              { key: 'teamUpdates' as const, label: 'Team Activity', desc: 'Member joins, task assignments, chat pins' },
              { key: 'quietHours' as const, label: 'Quiet Hours (10pm–8am)', desc: 'Suppress all notifications during quiet hours' },
            ].map((pref, i, arr) => (
              <div key={pref.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div>
                  <p style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-1)', margin: 0, marginBottom: 3 }}>{pref.label}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: 0 }}>{pref.desc}</p>
                </div>
                <button onClick={() => setNotifs(n => ({ ...n, [pref.key]: !n[pref.key] }))} style={{ width: 44, height: 24, borderRadius: 99, background: notifs[pref.key] ? 'var(--accent)' : 'var(--surface-3)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: notifs[pref.key] ? 23 : 3, transition: 'left 0.2s' }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "Privacy" && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 24 }}>
            <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-1)', marginBottom: 16 }}>Data & Privacy</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'What data is stored', desc: 'Event data, tasks, chat messages, member info', icon: '🔍' },
                { label: 'Download my data', desc: 'Export all your data as a ZIP file (GDPR)', icon: '📥' },
                { label: 'AI actions log', desc: 'View all automated AI actions taken on your account', icon: '🤖' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <div>
                      <p style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-1)', margin: 0 }}>{item.label}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: 0 }}>{item.desc}</p>
                    </div>
                  </div>
                  <button style={{ fontSize: '0.75rem', color: 'var(--accent)', background: 'none', border: '1px solid rgba(124,92,252,0.3)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>View →</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "Account" && (
        <div className="card" style={{ padding: 24 }}>
          <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-1)', marginBottom: 4 }}>Account</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: 20 }}>EventSync v1.0.0 · <a href="#" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Terms</a> · <a href="#" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Privacy Policy</a></p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div>
                <p style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-1)', margin: 0 }}>Connected Events</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: 0 }}>3 active events</p>
              </div>
              <button style={{ fontSize: '0.75rem', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>View →</button>
            </div>

            <button style={{ width: '100%', padding: '12px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-2)', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', textAlign: 'left' }}>
              🚪 Sign out
            </button>

            <button style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)', borderRadius: 10, color: 'var(--overdue)', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', textAlign: 'left' }}>
              🗑 Delete account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
