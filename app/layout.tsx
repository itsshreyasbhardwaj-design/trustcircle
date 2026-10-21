import type { Metadata, Viewport } from 'next';
import './globals.css';
import { getSettings } from '@/lib/auth';
import { currentUser } from '@/lib/session';

export const metadata: Metadata = {
  title: {
    default: 'TrustCircle — Think twice. Stay protected. Together.',
    template: '%s · TrustCircle',
  },
  description:
    'Check suspicious messages, understand warning signs, and verify unfamiliar requests with help from people you trust.',
  applicationName: 'TrustCircle',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'TrustCircle', statusBarStyle: 'default' },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#060e1a' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Accessibility and theme preferences are stored server-side, so they apply on the
  // first paint with no flash and no client-side theme script.
  const user = await currentUser();
  const settings = user ? getSettings(user.id) : null;

  return (
    <html
      lang={settings?.language ?? 'en'}
      data-theme={settings?.theme && settings.theme !== 'system' ? settings.theme : undefined}
      data-text-scale={settings?.text_scale !== 'normal' ? settings?.text_scale : undefined}
      data-reduce-motion={settings?.reduce_motion ? '1' : undefined}
      suppressHydrationWarning
    >
      <body>
        <a href="#main" className="tc-skip">Skip to main content</a>
        {children}
      </body>
    </html>
  );
}
