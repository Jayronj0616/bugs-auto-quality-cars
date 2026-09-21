import type { Metadata, Viewport } from 'next'
import { Inter, Sora } from 'next/font/google'

import { getSiteUrl } from '@/lib/env'

import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

const sora = Sora({
  variable: '--font-sora',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: 'BUGS Auto Quality Cars',
    template: '%s | BUGS Auto Quality Cars',
  },
  description:
    'Browse quality vehicles, see transparent cash and installment pricing, estimate your monthly payment and talk to BUGS Auto Quality Cars.',
  applicationName: 'BUGS Auto Quality Cars',
  formatDetection: { telephone: true, address: true, email: true },
  openGraph: {
    type: 'website',
    siteName: 'BUGS Auto Quality Cars',
    locale: 'en_PH',
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: '#0a0c0e',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable} h-full antialiased`}>
      {/* White is the 60% of the palette, so the page itself is white and
          sections tint themselves where separation is actually wanted. */}
      <body className="flex min-h-full flex-col bg-white text-ink-900">{children}</body>
    </html>
  )
}
