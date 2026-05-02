'use client';

import dynamic from 'next/dynamic';

const PostHogAnalytics = dynamic(() => import('./PostHogAnalytics'), { ssr: false });
const VercelAnalytics = dynamic(() => import('@vercel/analytics/next').then((m) => m.Analytics), { ssr: false });

export default function ClientAnalyticsWrapper() {
  return (
    <>
      <PostHogAnalytics />
      <VercelAnalytics />
    </>
  );
}
