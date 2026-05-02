'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

const PostHogAnalytics = dynamic(() => import('./PostHogAnalytics'), { ssr: false });
const VercelAnalytics = dynamic(() => import('@vercel/analytics/next').then((m) => m.Analytics), { ssr: false });

export default function ClientAnalyticsWrapper({ children }: { children: ReactNode }) {
  return (
    <>
      <PostHogAnalytics>{children}</PostHogAnalytics>
      <VercelAnalytics />
    </>
  );
}
