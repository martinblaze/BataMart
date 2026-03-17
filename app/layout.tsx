import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/styles/globals.css'

import { NavbarWrapper } from '@/components/layout/NavbarWrapper'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { NotificationPrompt } from '@/hooks/usePushSubscription'
import { SuspensionGuard } from '@/components/layout/SuspensionGuard'

// 🔥 PWA + UX
import PWARegister from '@/components/PWARegister'
import SplashScreen from '@/components/SplashScreen'
import InstallPrompt from '@/components/InstallPrompt'
import IosInstallPrompt from '@/components/IosInstallPrompt'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'BATAMART - UNIZIK Campus Marketplace',
  description: 'Student-to-student commerce at UNIZIK. Buy, sell, and deliver within campus.',

  manifest: '/manifest.json',

  icons: {
    icon: '/icon-192x192.png',
    apple: '/apple-touch-icon.png',
  },

  themeColor: '#0ea5e9',

  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BataMart',
  },

  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="application-name" content="BataMart" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="BataMart" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#0ea5e9" />

        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>

      <body className={inter.className}>
        <ThemeProvider>

          {/* 🔧 Core PWA */}
          <PWARegister />

          {/* 🎬 Splash (no lag, auto removes) */}
          <SplashScreen />

          {/* 📲 Install prompts (smart) */}
          <InstallPrompt />
          <IosInstallPrompt />

          {/* 🔐 Auth system */}
          <SuspensionGuard />

          {/* 🧭 Navigation */}
          <NavbarWrapper />

          {/* 📦 App */}
          <div>{children}</div>

          {/* 🔔 Push */}
          <NotificationPrompt />

        </ThemeProvider>
      </body>
    </html>
  )
}