import type { Metadata } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { PublicMobileHistorySeed } from '@/components/app/public-mobile-history-seed'
import SeyfPollarProvider from '@/components/providers/pollar-provider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-inter',
})
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Seyf — Buy now, Pay never',
  description:
    'Compra hoy, paga en tu ritmo. Ahorro, adelantos y liquidez con custodia Stellar vía Pollar.',
  generator: 'v0.app',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`dark ${inter.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <PublicMobileHistorySeed />
        <SeyfPollarProvider>{children}</SeyfPollarProvider>
        <Analytics />
      </body>
    </html>
  )
}
