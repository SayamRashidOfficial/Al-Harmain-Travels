import type { MetadataRoute } from 'next';

/**
 * Generates /sitemap.xml for Al Harmain Travels.
 *
 * Rules:
 *  - Includes canonical, public indexable pages only.
 *  - Main Booking page (/booking) included with priority 0.9 and weekly frequency.
 *  - Private role portals (/admin, /dispatcher, /driver, /customer), auth flows,
 *    and internal API routes are strictly excluded.
 */
interface PublicRouteConfig {
  path: string;
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

const PUBLIC_ROUTES: PublicRouteConfig[] = [
  {
    path: '',
    changeFrequency: 'weekly',
    priority: 1.0,
  },
  {
    path: '/booking',
    changeFrequency: 'weekly',
    priority: 0.9,
  },
  {
    path: '/services',
    changeFrequency: 'weekly',
    priority: 0.9,
  },
  {
    path: '/about',
    changeFrequency: 'monthly',
    priority: 0.8,
  },
  {
    path: '/contact',
    changeFrequency: 'monthly',
    priority: 0.8,
  },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://alharmaintravels.com';
  const lastModified = new Date();

  return PUBLIC_ROUTES.map((route) => ({
    url: route.path ? `${baseUrl}${route.path}` : baseUrl,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
