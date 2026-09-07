import type { MetadataRoute } from 'next';

/**
 * Owner review build: nothing here should be indexed. Paired with the
 * X-Robots-Tag header in netlify.toml, so a crawler is blocked whether it
 * reads robots.txt or not.
 *
 * Both come off together when mbud.de goes public — leaving one of the two in
 * place would silently keep the site out of search results.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', disallow: '/' }],
  };
}
