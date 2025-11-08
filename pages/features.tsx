import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Layout from '@/components/Layout'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  Trello, 
  CheckSquare, 
  Users, 
  Calendar, 
  DollarSign, 
  Clock, 
  Settings,
  MessageSquare,
  FileText,
  Search,
  Sparkles,
  Upload,
  Download,
  Filter,
  Archive,
  Bell,
  TrendingUp,
  BarChart3,
  Receipt,
  Wallet,
  History,
  UserPlus,
  Tag,
  GitBranch,
  Zap
} from 'lucide-react'

interface Feature {
  name: string
  description: string
  icon: any
  href: string
  badge?: string
  adminOnly?: boolean
}

const features: Feature[] = [
  {
    name: 'Dashboard',
    description: 'Overview of tasks, stats, and quick actions',
    icon: LayoutDashboard,
    href: '/dashboard'
  },
  {
    name: 'Boards',
    description: 'Create and manage project boards with Kanban view',
    icon: Trello,
    href: '/boards'
  },
  {
    name: 'Tasks',
    description: 'Full task management with filters and search',
    icon: CheckSquare,
    href: '/tasks'
  },
  {
    name: 'Time Tracking',
    description: 'Clock in/out, manual entries, and manager review',
    icon: Clock,
    href: '/time'
  },
  {
    name: 'Financials',
    description: 'Expense tracking, budgets, and financial reports',
    icon: DollarSign,
    href: '/financials',
    badge: 'Admin Only',
    adminOnly: true
  },
  {
    name: 'Calendar',
    description: 'View tasks and meetings in calendar format',
    icon: Calendar,
    href: '/calendar'
  },
  {
    name: 'Contacts',
    description: 'Manage business contacts and relationships',
    icon: Users,
    href: '/contacts'
  },
  {
    name: 'Meetings',
    description: 'Schedule and track team meetings',
    icon: MessageSquare,
    href: '/meetings'
  },
  {
    name: 'Search',
    description: 'Global search across all content',
    icon: Search,
    href: '/search'
  },
  {
    name: 'Notifications',
    description: 'Stay updated with real-time alerts',
    icon: Bell,
    href: '/notifications'
  },
  {
    name: 'Settings',
    description: 'Customize your account and preferences',
    icon: Settings,
    href: '/settings'
  }
]

const aiFeatures: Feature[] = [
  {
    name: 'AI Drop Zone',
    description: 'Upload documents for AI analysis and task extraction',
    icon: Upload,
    href: '/dashboard',
    badge: 'On Dashboard'
  },
  {
    name: 'Meeting Notes Extractor',
    description: 'Convert meeting notes into actionable tasks',
    icon: FileText,
    href: '/dashboard',
    badge: 'On Dashboard'
  },
  {
    name: 'Smart Search',
    description: 'AI-powered semantic search',
    icon: Sparkles,
    href: '/dashboard',
    badge: 'On Dashboard'
  },
  {
    name: 'AI Web Search',
    description: 'Search the web with AI assistance',
    icon: Search,
    href: '/dashboard',
    badge: 'On Dashboard'
  },
  {
    name: 'AI Intake System',
    description: 'AI suggests tasks from uploaded content',
    icon: Zap,
    href: '/boards',
    badge: 'On Boards'
  },
  {
    name: 'Duplicate Detection',
    description: 'AI identifies similar tasks automatically',
    icon: GitBranch,
    href: '/boards',
    badge: 'When Creating Tasks'
  }
]

const keyFeatures: Feature[] = [
  {
    name: 'Drag & Drop',
    description: 'Move tasks between columns with ease',
    icon: TrendingUp,
    href: '/boards'
  },
  {
    name: 'CSV Import/Export',
    description: 'Import from ClickUp, Notion, or export data',
    icon: Download,
    href: '/boards'
  },
  {
    name: 'Labels & Projects',
    description: 'Organize tasks with custom colored labels',
    icon: Tag,
    href: '/boards'
  },
  {
    name: 'Board Members',
    description: 'Collaborate with team members on boards',
    icon: UserPlus,
    href: '/boards'
  },
  {
    name: 'File Storage',
    description: 'Upload and manage important files',
    icon: FileText,
    href: '/dashboard',
    badge: 'On Dashboard'
  },
  {
    name: 'Message Board',
    description: 'Team communication and updates',
    icon: MessageSquare,
    href: '/dashboard',
    badge: 'On Dashboard'
  },
  {
    name: 'Expense Tracking',
    description: 'Track expenses with receipt uploads',
    icon: Receipt,
    href: '/financials',
    badge: 'Admin Only',
    adminOnly: true
  },
  {
    name: 'Budget Management',
    description: 'Set and monitor project budgets',
    icon: Wallet,
    href: '/financials',
    badge: 'Admin Only',
    adminOnly: true
  },
  {
    name: 'Time Entry Review',
    description: 'Approve/reject employee time entries',
    icon: History,
    href: '/time',
    badge: 'Manager Only'
  },
  {
    name: 'Audit Log',
    description: 'Complete history of time entry changes',
    icon: History,
    href: '/time',
    badge: 'Manager Only'
  },
  {
    name: 'Board Archiving',
    description: 'Archive completed or inactive boards',
    icon: Archive,
    href: '/boards'
  },
  {
    name: 'Advanced Filters',
    description: 'Filter by status, assignee, labels, and more',
    icon: Filter,
    href: '/tasks'
  }
]

export default function FeaturesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const isAdmin = session?.user?.role === 'ADMIN'

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Features</h1>
          <p className="text-gray-600">
            Explore all the powerful features available in Program Manager
          </p>
        </div>

        {/* Main Features */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Main Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature) => {
              // Hide admin-only features from non-admins
              if (feature.adminOnly && !isAdmin) return null

              return (
                <Link
                  key={feature.name}
                  href={feature.href}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                      <feature.icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{feature.name}</h3>
                        {feature.badge && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                            {feature.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* AI Features */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            AI-Powered Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {aiFeatures.map((feature) => (
              <Link
                key={feature.name}
                href={feature.href}
                className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-6 hover:shadow-lg hover:border-purple-300 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                    <feature.icon className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{feature.name}</h3>
                      {feature.badge && (
                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                          {feature.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Additional Features */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Additional Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {keyFeatures.map((feature) => {
              // Hide admin/manager-only features from regular users
              if (feature.adminOnly && !isAdmin) return null

              return (
                <Link
                  key={feature.name}
                  href={feature.href}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-green-300 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-green-50 rounded-lg group-hover:bg-green-100 transition-colors">
                      <feature.icon className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{feature.name}</h3>
                        {feature.badge && (
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                            {feature.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Feature Stats */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            80+ Features & Counting
          </h3>
          <p className="text-gray-600 mb-4">
            Comprehensive project management with AI assistance, time tracking, financials, and more
          </p>
          <div className="flex items-center justify-center gap-8 text-sm text-gray-600">
            <div>
              <div className="text-2xl font-bold text-blue-600">11</div>
              <div>Main Pages</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">6</div>
              <div>AI Features</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">12+</div>
              <div>Power Tools</div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
