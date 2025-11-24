import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import dynamic from 'next/dynamic'
import Layout from '@/components/Layout'
import AIDropZone from '@/components/AIDropZone'
import MeetingNotesExtractor from '@/components/MeetingNotesExtractor'
import SmartSearch from '@/components/SmartSearch'
import AIWebSearch from '@/components/AIWebSearch'
import MessageBoard from '@/components/MessageBoard'
import PhotoUploadCard from '@/components/PhotoUploadCard'
import { Plus, TrendingUp, Clock, CheckCircle, AlertTriangle, User, Sparkles } from 'lucide-react'
import TourGuide from '@/components/TourGuide'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

// Load DashboardFileStorage only on client-side to avoid hydration errors
const DashboardFileStorage = dynamic(() => import('@/components/DashboardFileStorage'), {
  ssr: false,
  loading: () => <div className="bg-white rounded-lg shadow p-6 h-48 animate-pulse" />
})

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const { data: boards } = useQuery({
    queryKey: ['boards'],
    queryFn: async () => {
      const { data } = await axios.get('/api/boards')
      return data
    },
    enabled: !!session
  })

  const { data: tasks } = useQuery({
    queryKey: ['dashboard-tasks'],
    queryFn: async () => {
      const { data } = await axios.get('/api/tasks')
      return data
    },
    enabled: !!session
  })

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // All tasks from user's boards
  const allMyBoardTasks = tasks || []
  
  // Tasks specifically assigned to me
  const assignedToMe = allMyBoardTasks.filter((t: any) => t.assigneeId === session?.user?.id)
  
  // Tasks due soon (from all board tasks)
  const dueSoon = allMyBoardTasks.filter((t: any) => {
    if (!t.dueDate) return false
    const dueDate = new Date(t.dueDate)
    const now = new Date()
    const diff = dueDate.getTime() - now.getTime()
    const days = diff / (1000 * 60 * 60 * 24)
    return days >= 0 && days <= 7
  })

  const stats = [
    {
      name: 'All Tasks',
      value: allMyBoardTasks.length,
      icon: CheckCircle,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      name: 'Assigned to Me',
      value: assignedToMe.length,
      icon: User,
      color: 'text-green-600',
      bg: 'bg-green-50'
    },
    {
      name: 'Due This Week',
      value: dueSoon.length,
      icon: Clock,
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    },
    {
      name: 'In Progress',
      value: allMyBoardTasks.filter((t: any) => t.status === 'IN_PROGRESS').length,
      icon: TrendingUp,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50'
    }
  ]

  return (
    <Layout>
      <TourGuide storageKey="tour_dashboard_seen" />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900" data-tour-id="dashboard-title">Dashboard</h1>
              <Link 
                href="/features"
                data-tour-id="features-link"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <Sparkles size={16} />
                <span>View All Features</span>
              </Link>
            </div>
            <p className="text-sm md:text-base text-gray-600 mt-1">
              Welcome back, {session?.user?.name}
            </p>
          </div>
          <Button onClick={() => router.push('/boards')}>
            <Plus size={20} className="md:mr-2" />
            <span className="hidden md:inline">New Task</span>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.name} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.name}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.bg} p-3 rounded-lg`}>
                  <stat.icon className={stat.color} size={24} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* AI Features */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div data-tour-id="ai-dropzone">
            <AIDropZone />
          </div>
          <MeetingNotesExtractor />
        </div>

        {/* Search Features */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <SmartSearch />
          <AIWebSearch />
        </div>

        {/* File Storage */}
        <div className="mb-8" data-tour-id="file-storage">
          <DashboardFileStorage />
        </div>

        {/* Quick Photo Upload */}
        <div className="mb-8">
          <PhotoUploadCard />
        </div>

        {/* Message Board */}
        <div className="mb-8">
          <MessageBoard />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Boards */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Boards</h2>
              <Link href="/boards" className="text-sm text-blue-600 hover:text-blue-700">
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {boards && Array.isArray(boards) && boards.slice(0, 5).map((board: any) => (
                <Link
                  key={board.id}
                  href={`/boards/${board.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold"
                      style={{ backgroundColor: board.color || '#3b82f6' }}
                    >
                      {board.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{board.name}</p>
                      <p className="text-sm text-gray-500">
                        {board._count?.tasks || 0} tasks
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Upcoming Tasks */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Due This Week</h2>
              <Link href="/tasks" className="text-sm text-blue-600 hover:text-blue-700">
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {dueSoon && Array.isArray(dueSoon) && dueSoon.slice(0, 5).map((task: any) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <p className="font-medium text-gray-900 mb-1">{task.title}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock size={14} />
                    <span>{formatDate(task.dueDate)}</span>
                    <span className="text-gray-300">•</span>
                    <span>{task.board.name}</span>
                  </div>
                </Link>
              ))}
              {dueSoon.length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  No tasks due this week
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
