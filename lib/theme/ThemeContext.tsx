import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import axios from 'axios'

export type ThemeMode = 'light' | 'dark' | 'disco'

interface ThemeContextValue {
  theme: ThemeMode
  setTheme: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = 'app_theme_mode'

const getStoredTheme = (): ThemeMode | null => {
  if (typeof window === 'undefined') {
    return null
  }

  const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null
  if (stored === 'light' || stored === 'dark' || stored === 'disco') {
    return stored
  }

  return null
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('light')
  const [initialized, setInitialized] = useState(false)
  const { data: session, status } = useSession()

  // Load theme from database when user logs in
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      axios.get('/api/user/preferences')
        .then(response => {
          if (response.data.theme) {
            setThemeState(response.data.theme as ThemeMode)
          }
        })
        .catch(error => {
          console.error('Failed to load user preferences:', error)
        })
    }
  }, [status, session])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const stored = getStoredTheme()
    if (stored) {
      setThemeState(stored)
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setThemeState('dark')
    }

    setInitialized(true)
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    const root = document.documentElement
    const body = document.body

    const classesToRemove = ['theme-light', 'theme-dark', 'theme-disco', 'dark']
    root.classList.remove(...classesToRemove)
    body.classList.remove(...classesToRemove)

    const themeClass = `theme-${theme}`
    root.dataset.theme = theme
    root.classList.add(themeClass)
    body.classList.add(themeClass)

    if (theme === 'dark') {
      root.classList.add('dark')
      body.classList.add('dark')
    }
  }, [theme])

  useEffect(() => {
    if (typeof window !== 'undefined' && initialized) {
      window.localStorage.setItem(STORAGE_KEY, theme)
    }
  }, [theme, initialized])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handler = (event: MediaQueryListEvent) => {
      const stored = getStoredTheme()
      if (!stored || stored === 'light' || stored === 'dark') {
        setThemeState(event.matches ? 'dark' : 'light')
      }
    }

    mediaQuery.addEventListener('change', handler)

    return () => {
      mediaQuery.removeEventListener('change', handler)
    }
  }, [])

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, mode)
    }
    
    // Save to database if user is authenticated
    if (status === 'authenticated') {
      axios.patch('/api/user/preferences', { theme: mode })
        .catch(error => {
          console.error('Failed to save theme preference:', error)
        })
    }
  }, [status])

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}
