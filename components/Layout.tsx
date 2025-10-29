import { ReactNode } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  BarChart3,
  DollarSign,
  Settings,
  Search,
  Bell,
  LogOut,
  Menu,
  Users,
  Truck,
  MessageSquare,
  Clock
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
    { name: 'Contacts', href: '/contacts', icon: Users },
    { name: 'Vendors', href: '/vendors', icon: Truck },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Financials', href: '/financials', icon: DollarSign },
    { name: 'Time Tracking', href: '/time', icon: Clock },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings },
    { name: 'Meetings', href: '/meetings', icon: MessageSquare },
  ]

  const filteredNavigation = navigation.filter((item) => {
    if (item.href === '/financials') {
      return session?.user?.role === 'ADMIN'
    }
    return true
  })

  return (
    <div className="min-h-screen text-foreground transition-colors duration-300 app-shell">
      {/* Mobile backdrop overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transition-transform duration-300 shadow-lg',
          !sidebarOpen && '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b">
            <Link href="/dashboard" className="flex items-center">
              <div
                className="w-64 h-20 bg-no-repeat bg-contain bg-left"
                style={{ backgroundImage: 'url(/images/sweetwaterlogo.png)' }}
                aria-label="Sweetwater"
              />
            </Link>
            {/* Mobile close button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 text-muted-foreground hover:bg-muted rounded-lg"
              aria-label="Close sidebar"
            >
              <Menu size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const isActive = router.pathname.startsWith(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* User menu */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary text-primary-foreground font-semibold">
                {session?.user?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {session?.user?.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {session?.user?.email}
                </p>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={cn('transition-all duration-300 lg:ml-64')}>
        {/* Header */}
        <header className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 md:px-6">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-muted-foreground hover:bg-muted rounded-lg"
            >
              <Menu size={20} />
            </button>

            <div className="flex items-center gap-4">
              {/* Search */}
              <button
                onClick={() => router.push('/search')}
                className="p-2 text-muted-foreground hover:bg-muted rounded-lg"
              >
                <Search size={20} />
              </button>

              {/* Notifications */}
              <button
                onClick={() => router.push('/notifications')}
                className="p-2 text-muted-foreground hover:bg-muted rounded-lg relative"
              >
                <Bell size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
