import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://divvy.es';

  return {
    rules: {
      userAgent: '*',
      allow: [
        '/',
        '/login',
        '/register',
        '/privacy',
        '/terms',
        '/cookies',
      ],
      disallow: [
        '/group/',
        '/join/',
        '/api/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
