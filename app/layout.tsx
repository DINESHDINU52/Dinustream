import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DinuStream — Private Cinema for Dinu & Kanmani',
  description:
    'Private premium streaming platform and synchronized playback cinema suite crafted exclusively for Dinu and Kanmani.',
  keywords: ['DinuStream', 'Private Cinema', 'Synchronized Playback', 'Dolby Atmos', '4K Streaming'],
  applicationName: 'DinuStream',
  formatDetection: {
    telephone: false,
  },
  appleWebApp: {
    capable: true,
    title: 'DinuStream',
    // Lets the player go edge-to-edge when launched from the iOS home screen.
    statusBarStyle: 'black-translucent',
  },
};

/**
 * Viewport configuration.
 *
 * This is the single most important piece of the responsive setup. Without
 * `width: 'device-width'` mobile browsers fall back to a ~980px virtual
 * viewport and then shrink the whole page, which means every Tailwind
 * breakpoint (`sm:`, `md:`, `lg:`) evaluates as "desktop" on a phone. That is
 * why the mobile layout, the bottom navigation and the mobile menu never
 * appeared on real devices.
 *
 * `viewportFit: 'cover'` lets content extend under the iOS notch / home
 * indicator; the `pb-safe` / `pt-safe` utilities in styles/cinema.css then pad
 * interactive UI back out of those unsafe regions.
 *
 * `maximumScale` / `userScalable` are intentionally left at their permissive
 * defaults so pinch-zoom keeps working — disabling zoom is an accessibility
 * failure (WCAG 1.4.4).
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#06080d',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark h-full antialiased bg-cinema-bg">
      {/*
        No texture overlay. A full-viewport noise layer used to sit on top of
        every glyph and every poster here, which is what cost the whole app its
        apparent sharpness — see the note in styles/cinema.css §4.
      */}
      <body className="min-h-full flex flex-col bg-cinema-bg text-slate-100">
        {children}
      </body>
    </html>
  );
}
