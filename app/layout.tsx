import type { Metadata } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
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
    <html lang="es" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-dvh font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <PublicMobileHistorySeed />
          <SeyfPollarProvider>{children}</SeyfPollarProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
