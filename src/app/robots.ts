import type { MetadataRoute } from 'next';

/**
 * Owner review build: nothing here should be indexed. Paired with the
 * X-Robots-Tag header in vercel.json, so a crawler is blocked whether it
 * reads robots.txt or not.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', disallow: '/' }],
  };
}
