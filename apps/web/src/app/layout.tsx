import { t } from '@dasi/i18n';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { fontVariables } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: t('vi', 'app.name'),
  description: t('vi', 'app.tagline'),
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
