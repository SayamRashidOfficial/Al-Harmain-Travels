import type { MetadataRoute } from 'next';

/**
 * Generates /robots.txt for Al Harmain Travels.
 *
 * Rules:
 *  - Public pages (/, /about, /services, /contact) are fully crawlable.
 *  - Private role portals (/admin, /dispatcher, /driver, /customer) are blocked.
 *  - Auth flows (/sign-in, /sign-up, /forgot-password, /reset-password,
 *    /verify-email, /verify-phone, /callback) are blocked to prevent indexing.
 *  - API routes and Next.js internal paths are blocked from crawling.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://alharmaintravels.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/booking',
          '/about',
          '/services',
          '/contact',
        ],
        disallow: [
          // Private role portals
          '/admin',
          '/admin/',
          '/dispatcher',
          '/dispatcher/',
          '/driver',
          '/driver/',
          '/customer',
          '/customer/',
          // Auth & recovery flows
          '/sign-in',
          '/sign-up',
          '/forgot-password',
          '/reset-password',
          '/verify-email',
          '/verify-phone',
          '/callback',
          // API endpoints
          '/api/',
          // Next.js internals
          '/_next/',
        ],
      },
      {
        userAgent: 'Bingbot',
        allow: [
          '/',
          '/booking',
          '/about',
          '/services',
          '/contact',
        ],
        disallow: [
          '/admin',
          '/admin/',
          '/dispatcher',
          '/dispatcher/',
          '/driver',
          '/driver/',
          '/customer',
          '/customer/',
          '/sign-in',
          '/sign-up',
          '/forgot-password',
          '/reset-password',
          '/verify-email',
          '/verify-phone',
          '/callback',
          '/api/',
          '/_next/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: 'alharmaintravels.com',
  };
}
