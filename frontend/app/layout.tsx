import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EVENTSYNC",
  description: "AI-powered event coordination platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
