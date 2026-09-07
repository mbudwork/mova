import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'MOVA', template: '%s' },
  description:
    'Понимай немецкого прораба на стройке. Тренажёр команд, инструментов и размеров для строителей.',
  applicationName: 'MOVA',
  appleWebApp: { capable: true, title: 'MOVA', statusBarStyle: 'default' },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Zoom stays enabled: workers read this in bad light and must be able to
  // pinch a German phrase larger.
  maximumScale: 5,
  themeColor: '#F7F3EC',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
