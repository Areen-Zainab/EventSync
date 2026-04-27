"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AuthFormProps = { mode: "login" | "signup" };

type AuthApiResponse = {
  success: boolean;
  message?: string;
  token?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: "Organizer" | "Member";
    plan?: "free" | "plus" | "premium";
  };
};

const formatPlanName = (plan: string | undefined): "Free" | "Plus" | "Premium" => {
  if (plan === "plus") return "Plus";
  if (plan === "premium") return "Premium";
  return "Free";
};

export default function AuthForm({ mode }: AuthFormProps) {
  const isLogin = mode === "login";
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const rawApiUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:5000";
  const API_BASE_URL = rawApiUrl.replace(/\/$/, "").endsWith("/api")
    ? rawApiUrl.replace(/\/$/, "")
    : `${rawApiUrl.replace(/\/$/, "")}/api`;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    if (!isLogin) {
      if (!name.trim()) {
        setError("Full name is required.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      if (!privacyConsent) {
        setError("You must accept the privacy policy.");
        return;
      }
    }

    setIsSubmitting(true);

    const endpoint = isLogin ? "login" : "signup";
    const payload = isLogin
      ? { email: email.trim(), password }
      : {
          name: name.trim(),
          email: email.trim(),
          password,
          role: "Organizer",
          privacy_consent: privacyConsent,
        };

    try {
      const response = await fetch(`${API_BASE_URL}/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result: AuthApiResponse = await response.json();

      if (!response.ok || !result.success || !result.token || !result.user) {
        setError(result.message || "Authentication failed. Please try again.");
        return;
      }

      localStorage.setItem("eventsync_token", result.token);
      localStorage.setItem("eventsync_user", JSON.stringify(result.user));
      localStorage.setItem("eventsync_plan", formatPlanName(result.user.plan));

      if (isLogin) {
        const loginAt = Date.now();
        const minDelayMs = 60 * 1000;
        const maxDelayMs = 120 * 1000;
        const randomDelayMs = Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1)) + minDelayMs;
        localStorage.setItem(`eventsync_feedback_login_at_${result.user.id}`, String(loginAt));
        localStorage.setItem(`eventsync_feedback_prompt_at_${result.user.id}`, String(loginAt + randomDelayMs));
      }

      setSuccessMessage(isLogin ? "Login successful." : "Signup successful.");
      router.push("/dashboard");
    } catch {
      setError("Unable to connect to server. Please check backend is running.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }} className="grid-bg">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between p-12" style={{ width: '45%', background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <span style={{ background: 'var(--accent)', borderRadius: 8, width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚡</span>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-1)' }}>EventSync</span>
        </div>

        <div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '2rem', color: 'var(--text-1)', lineHeight: 1.2, marginBottom: 16 }}>
            Your events, finally under control
          </h2>
          <p style={{ color: 'var(--text-2)', lineHeight: 1.7 }}>
            Join thousands of event teams who turned chaotic group chats into structured, AI-powered workflows.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 32 }}>
            {[
              { stat: '3x', label: 'faster task assignment' },
              { stat: '90%', label: 'fewer missed deadlines' },
              { stat: '2 min', label: 'average setup per event' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.25rem', color: 'var(--accent)' }}>{s.stat}</span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Secured with AES-256 encryption. GDPR compliant.</p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div style={{ width: '100%', maxWidth: 420 }}>
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8 justify-center">
            <span style={{ background: 'var(--accent)', borderRadius: 8, width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚡</span>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-1)' }}>EventSync</span>
          </div>

          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.75rem', color: 'var(--text-1)', marginBottom: 6 }}>
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: 32 }}>
            {isLogin ? 'Sign in to your EventSync workspace.' : 'Start coordinating smarter in minutes.'}
          </p>

          <form style={{ display: 'flex', flexDirection: 'column', gap: 16 }} onSubmit={handleSubmit}>
            {!isLogin && (
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}>Full name</label>
                <input className="input" placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}>Email address</label>
              <input className="input" type="email" placeholder="you@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}>Password</label>
              <input className="input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            {!isLogin && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}>Confirm password</label>
                  <input className="input" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={privacyConsent} onChange={(e) => setPrivacyConsent(e.target.checked)} style={{ marginTop: 2, accentColor: 'var(--accent)' }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
                    I agree to the <a href="#" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Privacy Policy</a> and consent to data processing as described.
                  </span>
                </label>
              </>
            )}

            {error && (
              <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>{error}</p>
            )}

            {successMessage && (
              <p style={{ color: '#10b981', fontSize: '0.85rem' }}>{successMessage}</p>
            )}

            <button type="submit" className="btn-primary py-3 text-sm mt-2" style={{ width: '100%' }} disabled={isSubmitting}>
              {isSubmitting ? 'Please wait...' : `${isLogin ? 'Sign in' : 'Create account'} →`}
            </button>

            {isLogin && (
              <p style={{ textAlign: 'center', fontSize: '0.8rem' }}>
                <a href="#" style={{ color: 'var(--text-3)', textDecoration: 'none' }}>Forgot password?</a>
              </p>
            )}
          </form>

          <p style={{ marginTop: 24, textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-2)' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <Link href={isLogin ? '/signup' : '/login'} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
              {isLogin ? 'Sign up free' : 'Log in'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
