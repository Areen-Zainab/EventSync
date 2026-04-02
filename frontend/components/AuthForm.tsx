"use client";
import Link from "next/link";
import { useState } from "react";

type AuthFormProps = { mode: "login" | "signup" };

export default function AuthForm({ mode }: AuthFormProps) {
  const isLogin = mode === "login";
  const [role, setRole] = useState<"organizer" | "member">("organizer");

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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {!isLogin && (
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}>Full name</label>
                <input className="input" placeholder="Jane Doe" />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}>Email address</label>
              <input className="input" type="email" placeholder="you@university.edu" />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}>Password</label>
              <input className="input" type="password" placeholder="••••••••" />
            </div>

            {!isLogin && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}>Confirm password</label>
                  <input className="input" type="password" placeholder="••••••••" />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-2)', marginBottom: 8 }}>Your role</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {(['organizer', 'member'] as const).map(r => (
                      <button key={r} onClick={() => setRole(r)} style={{
                        padding: '12px',
                        borderRadius: 10,
                        border: `1px solid ${role === r ? 'var(--accent)' : 'var(--border)'}`,
                        background: role === r ? 'rgba(124,92,252,0.12)' : 'var(--surface-2)',
                        color: role === r ? 'var(--accent)' : 'var(--text-2)',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        textTransform: 'capitalize',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}>
                        {r === 'organizer' ? '🎪' : '👤'} {r}
                      </button>
                    ))}
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" style={{ marginTop: 2, accentColor: 'var(--accent)' }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
                    I agree to the <a href="#" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Privacy Policy</a> and consent to data processing as described.
                  </span>
                </label>
              </>
            )}

            <button className="btn-primary py-3 text-sm mt-2" style={{ width: '100%' }}>
              {isLogin ? 'Sign in' : 'Create account'} →
            </button>

            {isLogin && (
              <p style={{ textAlign: 'center', fontSize: '0.8rem' }}>
                <a href="#" style={{ color: 'var(--text-3)', textDecoration: 'none' }}>Forgot password?</a>
              </p>
            )}
          </div>

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
