import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import Image from 'next/image'
import Layout from '@/components/Layout'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import {
  BarChart3,
  TrendingUp,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  Download,
  Filter
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ReportsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [selectedBoard, setSelectedBoard] = useState('ALL')
  const [dateRange, setDateRange] = useState('30') // days

  const handleExport = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedBoard !== 'ALL') params.append('boardId', selectedBoard)
      params.append('days', dateRange)
      
      const response = await axios.get(`/api/analytics/export?${params.toString()}`, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `report-${Date.now()}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

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

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', selectedBoard, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedBoard !== 'ALL') params.append('boardId', selectedBoard)
      params.append('days', dateRange)
      const { data } = await axios.get(`/api/analytics?${params.toString()}`)
      return data
    },
    enabled: !!session
  })

  if (status === 'loading' || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  const stats = [
    {
      label: 'Total Tasks',
      value: analytics?.totalTasks || 0,
      icon: BarChart3,
      color: 'bg-blue-500',
      change: analytics?.tasksChange || 0
    },
    {
      label: 'Completed',
      value: analytics?.completedTasks || 0,
      icon: CheckCircle,
      color: 'bg-green-500',
      change: analytics?.completedChange || 0
    },
    {
      label: 'In Progress',
      value: analytics?.inProgressTasks || 0,
      icon: Clock,
      color: 'bg-yellow-500',
      change: analytics?.inProgressChange || 0
    },
    {
      label: 'Overdue',
      value: analytics?.overdueTasks || 0,
      icon: AlertCircle,
      color: 'bg-red-500',
      change: analytics?.overdueChange || 0
    }
  ]

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-600 mt-1">Track your team&apos;s progress and performance</p>
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download size={16} className="mr-2" />
            Export Report
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>
            <Select
              value={selectedBoard}
              onChange={(e) => setSelectedBoard(e.target.value)}
              className="w-48"
            >
              <option value="ALL">All Boards</option>
              {boards?.map((board: any) => (
                <option key={board.id} value={board.id}>
                  {board.name}
                </option>
              ))}
            </Select>
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-48"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </Select>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={cn('p-3 rounded-lg', stat.color, 'bg-opacity-10')}>
                  <stat.icon className={cn('w-6 h-6', stat.color.replace('bg-', 'text-'))} />
                </div>
                {stat.change !== 0 && (
                  <div className={cn(
                    'flex items-center gap-1 text-sm font-medium',
                    stat.change > 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    <TrendingUp size={14} className={stat.change < 0 ? 'rotate-180' : ''} />
                    {Math.abs(stat.change)}%
                  </div>
                )}
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Status Distribution */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
            <div className="space-y-4">
              {analytics?.statusDistribution?.map((item: any) => (
                <div key={item.status}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{item.status}</span>
                    <span className="text-sm text-gray-600">{item.count} tasks</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={cn(
                        'h-2 rounded-full',
                        item.status === 'DONE' && 'bg-green-500',
                        item.status === 'IN_PROGRESS' && 'bg-yellow-500',
                        item.status === 'BLOCKED' && 'bg-red-500',
                        item.status === 'BACKLOG' && 'bg-gray-500',
                        item.status === 'NEXT_7_DAYS' && 'bg-blue-500'
                      )}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Priority Distribution */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Priority Distribution</h3>
            <div className="space-y-4">
              {analytics?.priorityDistribution?.map((item: any) => (
                <div key={item.priority}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{item.priority}</span>
                    <span className="text-sm text-gray-600">{item.count} tasks</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={cn(
                        'h-2 rounded-full',
                        item.priority === 'URGENT' && 'bg-red-500',
                        item.priority === 'HIGH' && 'bg-orange-500',
                        item.priority === 'MEDIUM' && 'bg-yellow-500',
                        item.priority === 'LOW' && 'bg-green-500'
                      )}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Team Performance */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users size={20} />
            Team Performance
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Team Member</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Assigned</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Completed</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">In Progress</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Completion Rate</th>
                </tr>
              </thead>
              <tbody>
                {analytics?.teamPerformance?.map((member: any) => (
                  <tr key={member.userId} className="border-b border-gray-100">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {member.avatar ? (
                          <Image
                            src={member.avatar}
                            alt={member.name}
                            width={32}
                            height={32}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                            {member.name.charAt(0)}
                          </div>
                        )}
                        <span className="text-sm font-medium text-gray-900">{member.name}</span>
                      </div>
                    </td>
                    <td className="text-center py-3 px-4 text-sm text-gray-600">{member.assigned}</td>
                    <td className="text-center py-3 px-4 text-sm text-green-600 font-medium">{member.completed}</td>
                    <td className="text-center py-3 px-4 text-sm text-yellow-600 font-medium">{member.inProgress}</td>
                    <td className="text-center py-3 px-4">
                      <span className={cn(
                        'text-sm font-medium',
                        member.completionRate >= 80 ? 'text-green-600' :
                        member.completionRate >= 50 ? 'text-yellow-600' :
                        'text-red-600'
                      )}>
                        {member.completionRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar size={20} />
            Recent Activity
          </h3>
          <div className="space-y-4">
            {analytics?.recentActivity?.map((activity: any, index: number) => (
              <div key={index} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0">
                <div className={cn(
                  'w-2 h-2 rounded-full mt-2',
                  activity.type === 'completed' && 'bg-green-500',
                  activity.type === 'created' && 'bg-blue-500',
                  activity.type === 'updated' && 'bg-yellow-500'
                )} />
                <div className="flex-1">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{activity.userName}</span> {activity.action}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
