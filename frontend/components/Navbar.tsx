import Link from "next/link";

export default function Navbar() {
  return (
    <nav style={{ background: 'rgba(10,10,15,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}
      className="w-full flex items-center justify-between px-8 py-4 sticky top-0 z-50">
      <Link href="/dashboard" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-1)' }}
        className="text-xl font-bold tracking-tight flex items-center gap-2">
        <span style={{ background: 'var(--accent)', borderRadius: '8px', width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚡</span>
        EventSync
      </Link>

      <div className="hidden md:flex items-center gap-8 text-sm font-medium" style={{ color: 'var(--text-2)' }}>
        <Link href="#features" className="hover:text-white transition-colors" style={{ color: 'inherit' }}>Features</Link>
        <Link href="#pricing" className="hover:text-white transition-colors" style={{ color: 'inherit' }}>Pricing</Link>
        <Link href="#about" className="hover:text-white transition-colors" style={{ color: 'inherit' }}>About</Link>
      </div>

      <div className="flex items-center gap-3">
        <Link href="/login" className="btn-ghost text-sm font-medium px-4 py-2" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>
          Log in
        </Link>
        <Link href="/signup" className="btn-primary text-sm px-4 py-2" style={{ textDecoration: 'none' }}>
          Get Started →
        </Link>
      </div>
    </nav>
  );
}
