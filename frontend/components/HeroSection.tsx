import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="flex flex-col items-center justify-center text-center px-6 py-28 bg-gradient-to-b from-indigo-50 to-white">
      <span className="text-xs font-semibold uppercase tracking-widest text-indigo-500 bg-indigo-100 px-3 py-1 rounded-full mb-6">
        AI-Powered Coordination
      </span>
      <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight max-w-3xl">
        Turn Event Chaos <br className="hidden md:block" /> into Clarity
      </h1>
      <p className="mt-6 text-lg text-gray-500 max-w-xl">
        AI-powered coordination that converts team chats into tasks — so your events run smoothly, every time.
      </p>
      <div className="mt-10 flex flex-col sm:flex-row gap-4">
        <Link
          href="/signup"
          className="px-7 py-3 bg-indigo-600 text-white font-semibold rounded-2xl hover:bg-indigo-700 transition-colors shadow-md"
        >
          Get Started
        </Link>
        <Link
          href="/login"
          className="px-7 py-3 border border-gray-300 text-gray-700 font-semibold rounded-2xl hover:border-indigo-400 hover:text-indigo-600 transition-colors"
        >
          Login
        </Link>
      </div>
    </section>
  );
}
