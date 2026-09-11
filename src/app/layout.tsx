import type { Metadata, Viewport } from 'next';
import './globals.css';
import { env } from '@/lib/config/env';

export const metadata: Metadata = {
  /*
    Без metadataBase Next отдаёт относительные адреса в openGraph и canonical,
    а соцсети и поисковики их не разворачивают: превью ссылки приходит пустым.
  */
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: { default: 'MOVA', template: '%s' },
  description:
    'Понимай немецкого прораба на стройке. Тренажёр команд, инструментов и размеров для строителей.',
  applicationName: 'MOVA',
  /*
    statusBarStyle: black-translucent — интерфейс тёмный, и светлая системная
    полоса поверх графита выглядела бы чужой заплаткой при запуске с ярлыка.
  */
  appleWebApp: { capable: true, title: 'MOVA', statusBarStyle: 'black-translucent' },
  icons: {
    /*
      Порядок важен: браузер берёт первую подходящую по размеру. .ico идёт
      первым как универсальный запасной вариант для старых движков и для
      вкладок, PNG — для всего остального.
    */
    icon: [
      { url: '/icons/favicon.ico', sizes: 'any' },
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-64.png', sizes: '64x64', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    // iOS берёт именно этот файл при добавлении на домашний экран.
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Zoom stays enabled: workers read this in bad light and must be able to
  // pinch a German phrase larger.
  maximumScale: 5,
  themeColor: '#0A0B0D',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
