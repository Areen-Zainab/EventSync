import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="w-full flex items-center justify-between px-8 py-4 border-b border-gray-100 bg-white sticky top-0 z-50">
      <Link href="/" className="text-xl font-bold text-indigo-600 tracking-tight">
        EVENTSYNC
      </Link>

      <div className="hidden md:flex items-center gap-8 text-sm text-gray-600 font-medium">
        <Link href="#features" className="hover:text-indigo-600 transition-colors">Features</Link>
        <Link href="#about" className="hover:text-indigo-600 transition-colors">About</Link>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors px-4 py-2"
        >
          Login
        </Link>
        <Link
          href="/signup"
          className="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-2xl hover:bg-indigo-700 transition-colors"
        >
          Sign Up
        </Link>
      </div>
    </nav>
  );
}
