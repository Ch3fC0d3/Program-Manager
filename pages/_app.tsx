import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { ThemeProvider } from '@/lib/theme/ThemeContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return
    }

    if (process.env.NODE_ENV === 'production') {
      import('@/lib/offline').then(({ registerServiceWorker }) => {
        registerServiceWorker()
      })
    } else {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => {
          regs.forEach((reg) => reg.unregister())
        })
        .catch((error) => {
          console.warn('Failed to unregister service workers in development:', error)
        })
        .finally(() => {
          if ('caches' in window) {
            caches
              .keys()
              .then((keys) => {
                keys.forEach((key) => caches.delete(key).catch(() => {}))
              })
              .catch((error) => {
                console.warn('Failed to clear caches in development:', error)
              })
          }
        })
    }
  }, [])

  return (
    <SessionProvider session={session}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Component {...pageProps} />
          <Toaster position="top-right" />
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  )
}
