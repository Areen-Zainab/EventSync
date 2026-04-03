"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AccountSettings = {
  taskReminders: boolean;
  aiAlerts: boolean;
  teamUpdates: boolean;
  quietHours: boolean;
};

type AccountUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type MeResponse = {
  success: boolean;
  user?: AccountUser;
  settings?: AccountSettings;
  message?: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";
const tabs = ["Profile", "Notifications", "Privacy", "Account"] as const;

const defaultSettings: AccountSettings = {
  taskReminders: true,
  aiAlerts: true,
  teamUpdates: false,
  quietHours: true,
};

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [user, setUser] = useState<AccountUser | null>(null);
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [notifs, setNotifs] = useState<AccountSettings>(defaultSettings);

  const initials = useMemo(() => {
    if (!profile.name) return "A";
    return profile.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }, [profile.name]);

  const authHeaders = (): HeadersInit => {
    const token = typeof window !== "undefined" ? localStorage.getItem("eventsync_token") : null;
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const clearSession = () => {
    localStorage.removeItem("eventsync_token");
    localStorage.removeItem("eventsync_user");
  };
  
  const broadcastAccountUpdate = () => {
    window.dispatchEvent(new Event("eventsync-account-updated"));
  };

  const loadAccount = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("eventsync_token") : null;
    if (!token) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data: MeResponse = await response.json();
      if (!response.ok || !data.success || !data.user) {
        throw new Error(data.message || "Failed to load account.");
      }

      setUser(data.user);
      setProfile({ name: data.user.name || "", email: data.user.email || "" });
      setNotifs(data.settings || defaultSettings);
      localStorage.setItem("eventsync_user", JSON.stringify(data.user));
        broadcastAccountUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load account.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAccount();
  }, []);

  const saveChanges = async () => {
    if (!profile.name.trim() || !profile.email.trim()) {
      setError("Name and email are required.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          name: profile.name.trim(),
          email: profile.email.trim(),
          settings: notifs,
        }),
      });

      const data: MeResponse = await response.json();
      if (!response.ok || !data.success || !data.user) {
        throw new Error(data.message || "Failed to save changes.");
      }

      setUser(data.user);
      setProfile({ name: data.user.name, email: data.user.email });
      if (data.settings) {
        setNotifs(data.settings);
      }
      localStorage.setItem("eventsync_user", JSON.stringify(data.user));
        broadcastAccountUpdate();
      setSuccess("Changes saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const saveNotificationPrefs = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ settings: notifs }),
      });

      const data: MeResponse = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to save notification settings.");
      }

      if (data.user) {
        setUser(data.user);
        localStorage.setItem("eventsync_user", JSON.stringify(data.user));
          broadcastAccountUpdate();
      }
      if (data.settings) {
        setNotifs(data.settings);
      }
      setSuccess("Notification preferences saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save notification settings.");
    } finally {
      setSaving(false);
    }
  };

  const signOut = () => {
    clearSession();
      broadcastAccountUpdate();
    router.push("/login");
  };

  const deleteAccount = async () => {
    const confirmed = window.confirm("Delete your account? This will remove your data from the database.");
    if (!confirmed) return;

    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      const data: MeResponse = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete account.");
      }

      clearSession();
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account.");
    } finally {
      setDeleting(false);
    }
  };

  const toggleSetting = (key: keyof AccountSettings) => {
    setNotifs((current) => ({ ...current, [key]: !current[key] }));
  };

  if (loading) {
    return <div style={{ padding: "32px 36px", color: "var(--text-3)" }}>Loading settings...</div>;
  }

  return (
    <div style={{ padding: '32px 36px', maxWidth: 700 }}>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-1)', marginBottom: 12 }}>Settings</h1>
      {error && <p style={{ marginBottom: 12, color: 'var(--overdue)', fontSize: '0.85rem', fontWeight: 600 }}>{error}</p>}
      {success && <p style={{ marginBottom: 12, color: 'var(--on-track)', fontSize: '0.85rem', fontWeight: 600 }}>{success}</p>}

      <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {tabs.map((t) => (
          <button key={t} onClick={() => setActiveTab(t)} style={{ padding: '10px 18px', background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === t ? 'var(--accent)' : 'transparent'}`, color: activeTab === t ? 'var(--accent)' : 'var(--text-2)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', transition: 'color 0.15s', marginBottom: -1 }}>{t}</button>
        ))}
      </div>

      {activeTab === "Profile" && (
        <div className="card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent-3))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{initials}</div>
            <div>
              <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem', color: 'var(--text-1)', marginBottom: 4 }}>{profile.name || 'Unnamed account'}</p>
              <button style={{ fontSize: '0.75rem', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Change avatar</button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}>Full Name</label>
              <input className="input" value={profile.name} onChange={(e) => setProfile((current) => ({ ...current, name: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}>Email</label>
              <input className="input" value={profile.email} onChange={(e) => setProfile((current) => ({ ...current, email: e.target.value }))} />
            </div>
            <button onClick={saveChanges} className="btn-primary text-sm" style={{ alignSelf: 'flex-start', padding: '10px 22px', opacity: saving ? 0.75 : 1 }} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
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
                <button onClick={() => toggleSetting(pref.key)} style={{ width: 44, height: 24, borderRadius: 99, background: notifs[pref.key] ? 'var(--accent)' : 'var(--surface-3)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: notifs[pref.key] ? 23 : 3, transition: 'left 0.2s' }} />
                </button>
              </div>
            ))}
          </div>
          <button onClick={saveNotificationPrefs} className="btn-primary text-sm" style={{ marginTop: 20, padding: '10px 22px', opacity: saving ? 0.75 : 1 }} disabled={saving}>
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
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
                <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: 0 }}>You can manage event memberships from the Events section</p>
              </div>
            </div>

            <button onClick={signOut} style={{ width: '100%', padding: '12px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-2)', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', textAlign: 'left' }}>
              🚪 Sign out
            </button>

            <button onClick={deleteAccount} disabled={deleting} style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)', borderRadius: 10, color: 'var(--overdue)', fontSize: '0.875rem', fontWeight: 500, cursor: deleting ? 'not-allowed' : 'pointer', textAlign: 'left', opacity: deleting ? 0.75 : 1 }}>
              {deleting ? 'Deleting...' : '🗑 Delete account'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
