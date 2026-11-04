import type { MetadataRoute } from 'next';

/**
 * Generates /sitemap.xml for Al Harmain Travels.
 *
 * Canonical public indexable pages only.
 * Private portals, auth flows, and internal API routes are intentionally excluded.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://alharmaintravels.com';
  const lastModified = new Date();

  return [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/services`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];
}
