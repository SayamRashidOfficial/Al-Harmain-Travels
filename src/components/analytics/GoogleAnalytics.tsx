import Script from 'next/script';
import GoogleAnalyticsTracker from './GoogleAnalyticsTracker';

/**
 * Google Analytics 4 (GA4) Tag Loader
 *
 * Requirements fulfilled:
 * 1. Official Google tag (gtag.js).
 * 2. Next.js Script with strategy="afterInteractive".
 * 3. GA4 Measurement ID loaded from NEXT_PUBLIC_GA_ID environment variable (never hardcoded).
 * 4. send_page_view: false in initial gtag config to prevent duplicate page_view events.
 * 5. GoogleAnalyticsTracker client component for SPA route transitions.
 */
export default function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  if (!gaId) {
    return null;
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
      <Script
        id="google-analytics-gtag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}', {
              send_page_view: false
            });
          `,
        }}
      />
      <GoogleAnalyticsTracker gaId={gaId} />
    </>
  );
}

