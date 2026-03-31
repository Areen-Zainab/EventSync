import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white py-10 px-6">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <span className="text-lg font-bold text-indigo-600">EVENTSYNC</span>

        <div className="flex gap-6 text-sm text-gray-500">
          <Link href="#features" className="hover:text-indigo-600 transition-colors">Features</Link>
          <Link href="#about" className="hover:text-indigo-600 transition-colors">About</Link>
          <Link href="/login" className="hover:text-indigo-600 transition-colors">Login</Link>
          <Link href="/signup" className="hover:text-indigo-600 transition-colors">Sign Up</Link>
        </div>

        <p className="text-xs text-gray-400">© {new Date().getFullYear()} EVENTSYNC. All rights reserved.</p>
      </div>
    </footer>
  );
}
