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
    background_color: '#0A0B0D',
    theme_color: '#0A0B0D',
    lang: 'ru',
    /*
      Три иконки, и maskable отдельным файлом не для галочки. Android
      обрезает иконку под форму лаунчера — круг, скруглённый квадрат, каплю, —
      и берёт для этого именно maskable-вариант. Если подсунуть ему обычную,
      у которой скругление уже нарисовано, углы срежет второй раз и плашка
      получится обрубленной. В maskable-версии логотип уменьшен до 80% и
      лежит на фоне во всю площадь, так что резать можно как угодно.
    */
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
