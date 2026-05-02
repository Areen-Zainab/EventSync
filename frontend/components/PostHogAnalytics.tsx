'use client';

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import posthog from "posthog-js";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

export default function PostHogAnalytics({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!POSTHOG_KEY || isReady) {
      return;
    }

    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: false,
      capture_pageleave: true,
      loaded: (instance) => {
        if (process.env.NODE_ENV === "development") {
          instance.debug();
        }
      },
    });

    setIsReady(true);
  }, [isReady]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    posthog.capture("$pageview", {
      $current_url: window.location.href,
      $pathname: pathname,
      $search: searchParams.toString(),
    });
  }, [isReady, pathname, searchParams]);

  return <>{children}</>;
}