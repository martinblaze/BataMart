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

        {/*
          ── BULLETPROOF SPLASH BLOCKER ──────────────────────────────────────
          This inline script runs SYNCHRONOUSLY before React hydrates.
          If we're in standalone PWA mode AND haven't shown the splash yet
          this session, we add 'splash-pending' to <body> which hides all
          page content via CSS until SplashScreen removes the class.
          This eliminates the flash of marketplace before splash 100%.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var isStandalone = window.matchMedia('(display-mode: standalone)').matches
                    || window.navigator.standalone === true;
                  var isAppParam = window.location.search.indexOf('app=true') !== -1;
                  var isAndroid = window.location.search.indexOf('android=true') !== -1;
                  var splashShown = sessionStorage.getItem('batamart_splash_app');

                  if (!isAndroid && (isStandalone || isAppParam) && !splashShown) {
                    document.documentElement.classList.add('splash-pending');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>

      <body className={inter.className}>
        <ThemeProvider>
          <PWARegister />
          <SplashScreen />
          <InstallPrompt />
          <IosInstallPrompt />
          <SuspensionGuard />
          <NavbarWrapper />
          <div>{children}</div>
          <NotificationPrompt />
        </ThemeProvider>
      </body>
    </html>
  )
}