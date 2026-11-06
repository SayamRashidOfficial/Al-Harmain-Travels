'use client';

import { useEffect, useRef, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { pageview } from '@/lib/analytics';

interface GoogleAnalyticsTrackerProps {
  gaId: string;
}

function TrackerInner({ gaId }: GoogleAnalyticsTrackerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!gaId || !pathname) return;

    const queryString = searchParams?.toString();
    const fullUrl = queryString ? `${pathname}?${queryString}` : pathname;

    // Avoid duplicate page_view events on identical URL or React StrictMode duplicate renders
    if (lastTrackedUrl.current === fullUrl) {
      return;
    }

    lastTrackedUrl.current = fullUrl;
    pageview(fullUrl);
  }, [pathname, searchParams, gaId]);

  return null;
}

export default function GoogleAnalyticsTracker({ gaId }: GoogleAnalyticsTrackerProps) {
  return (
    <Suspense fallback={null}>
      <TrackerInner gaId={gaId} />
    </Suspense>
  );
}

