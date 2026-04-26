import type { Metadata } from 'next';
import { Source_Serif_4, Inter } from 'next/font/google';
import './globals.css';

/**
 * Editorial typography:
 *
 * Source Serif 4 — used for headlines, the high-level summary, and
 * pull-quote-style theme callouts. Conveys considered, magazine-like
 * thoughtfulness.
 *
 * Inter — used for UI chrome, scores, table cells, and anywhere
 * dense readable data needs to live. Pairs cleanly with the serif.
 *
 * Both loaded as CSS variables so Tailwind utilities can reference them.
 */

const serif = Source_Serif_4({
  variable: '--font-serif',
  subsets: ['latin'],
  display: 'swap',
});

const sans = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Screened',
  description:
    'Make informed choices about what your kids watch. Screened collects and organises what other parents have noticed, so you can decide.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${serif.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-paper text-ink">
        {children}
      </body>
    </html>
  );
}
