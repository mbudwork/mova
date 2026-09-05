import type { MetadataRoute } from 'next';

/**
 * PWA foundation. Installation is a convenience, never a gate: the course
 * works identically in a normal browser tab, and nothing in the product
 * requires the manifest to have been honoured.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MOVA — немецкий для стройки',
    short_name: 'MOVA',
    description: 'Понимай, что говорит немецкий прораб на стройке.',
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#EDEBE6',
    theme_color: '#EDEBE6',
    lang: 'ru',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
