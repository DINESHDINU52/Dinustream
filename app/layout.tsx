import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DinuStream — Private Cinema for Dinu & Kanmani',
  description:
    'Private premium streaming platform and synchronized playback cinema suite crafted exclusively for Dinu and Kanmani.',
  keywords: ['DinuStream', 'Private Cinema', 'Synchronized Playback', 'Dolby Atmos', '4K Streaming'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark h-full antialiased bg-[#050507]">
      <head>
        <meta name="theme-color" content="#050507" />
      </head>
      <body className="min-h-full flex flex-col bg-[#050507] text-zinc-100 cinema-film-grain">
        {children}
      </body>
    </html>
  );
}
