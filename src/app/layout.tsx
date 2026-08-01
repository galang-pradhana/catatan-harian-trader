import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/shared/theme-provider'
import { QueryProvider } from '@/components/shared/query-provider'
import { ToastContainer } from '@/components/shared/toast'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'Catatan Harian Trader — Trading Journal Forex & Auto Sync MT5',
  description: 'Jurnal trading forex otomatis untuk trader retail MetaTrader 5. Evaluasi performa, tingkatkan disiplin, dan lacak statistik trading Anda.',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" className={`${inter.variable} dark`} suppressHydrationWarning>
      <body className="font-sans antialiased min-h-screen bg-background text-foreground flex flex-col">
        <QueryProvider>
          <ThemeProvider>
            {children}
            <ToastContainer />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  )
}

