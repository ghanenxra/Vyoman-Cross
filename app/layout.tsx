import type { Metadata } from 'next';
import { Exo_2, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const exo2 = Exo_2({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Vyoman Cross — Naked-Eye Satellite Tracker',
  description:
    'See what satellites are flying over you right now. Get direction, angle, and timing for naked-eye visible passes.',
  keywords: ['satellite tracker', 'ISS tracker', 'night sky', 'visible passes', 'starlink'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${exo2.variable} ${inter.variable} ${jetbrainsMono.variable} min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
