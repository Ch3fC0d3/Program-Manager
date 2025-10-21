import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import Layout from '@/components/Layout'
import Button from '@/components/ui/Button'
import { Bell, Check, Trash2, CheckCheck, Clock, Calendar, Settings, Filter } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDateTime, formatDate } from '@/lib/utils'

export default function NotificationsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'all' | 'unread'>('unread')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [showUpcoming, setShowUpcoming] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', filter],
    queryFn: async () => {
      const { data } = await axios.get('/api/user/notifications', {
        params: filter === 'unread' ? { unreadOnly: true } : {}
      })
      return data
    },
    enabled: !!session
  })

  // Fetch upcoming reminders (tasks due soon, upcoming meetings)
  const { data: upcomingItems } = useQuery({
    queryKey: ['upcoming-notifications'],
    queryFn: async () => {
      const [tasks, meetings] = await Promise.all([
        axios.get('/api/tasks/reminders'),
        axios.get('/api/meetings', { params: { upcoming: true } })
      ])
      return {
        tasks: tasks.data,
        meetings: meetings.data.slice(0, 5) // Next 5 meetings
      }
    },
    enabled: !!session && showUpcoming
  })

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await axios.patch(`/api/user/notifications/${notificationId}`, {
        read: true
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Marked as read')
    },
    onError: () => {
      toast.error('Failed to mark as read')
    }
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await axios.post('/api/user/notifications/mark-all-read')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('All notifications marked as read')
    },
    onError: () => {
      toast.error('Failed to mark all as read')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await axios.delete(`/api/user/notifications/${notificationId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Notification deleted')
    },
    onError: () => {
      toast.error('Failed to delete notification')
    }
  })

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id)
    }
    if (notification.link) {
      router.push(notification.link)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TASK_ASSIGNED':
      case 'TASK_COMPLETED':
      case 'TASK_DUE_SOON':
      case 'TASK_OVERDUE':
        return '📋'
      case 'COMMENT_ADDED':
      case 'COMMENT_MENTION':
        return '💬'
      case 'BOARD_INVITE':
        return '📊'
      default:
        return '🔔'
    }
  }

  // Filter notifications by type
  const filteredNotifications = notifications?.filter((n: any) => {
    if (typeFilter === 'all') return true
    return n.type === typeFilter
  }) || []

  // Get unique notification types for filter dropdown
  const notificationTypes = Array.from(
    new Set(notifications?.map((n: any) => n.type) || [])
  ) as string[]

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/settings?tab=notifications')}
            >
              <Settings size={16} className="mr-2" />
              Settings
            </Button>
            {notifications?.some((n: any) => !n.read) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                <CheckCheck size={16} className="mr-2" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Filter Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 font-medium rounded-lg transition-colors ${
                  filter === 'unread'
                    ? 'bg-blue-100 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Unread
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 font-medium rounded-lg transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-100 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                All
              </button>
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-500" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                {notificationTypes.map((type: string) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle Upcoming */}
            <button
              onClick={() => setShowUpcoming(!showUpcoming)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                showUpcoming
                  ? 'bg-purple-100 text-purple-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Clock size={16} />
              <span className="text-sm font-medium">Upcoming</span>
            </button>
          </div>
        </div>

        {/* Upcoming Notifications */}
        {showUpcoming && upcomingItems && (upcomingItems.tasks?.length > 0 || upcomingItems.meetings?.length > 0) && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={20} className="text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Upcoming Tasks */}
              {upcomingItems.tasks?.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <span>📋</span>
                    Tasks Due Soon ({upcomingItems.tasks.length})
                  </h3>
                  <div className="space-y-2">
                    {upcomingItems.tasks.slice(0, 3).map((task: any) => (
                      <div
                        key={task.id}
                        onClick={() => router.push(`/tasks/${task.id}`)}
                        className="p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate flex-1">
                            {task.title}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ml-2 ${
                            task.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                            task.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {task.priority}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Due: {formatDate(task.dueDate)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Meetings */}
              {upcomingItems.meetings?.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <span>👥</span>
                    Upcoming Meetings ({upcomingItems.meetings.length})
                  </h3>
                  <div className="space-y-2">
                    {upcomingItems.meetings.map((meeting: any) => (
                      <div
                        key={meeting.id}
                        onClick={() => router.push(`/meetings/${meeting.id}`)}
                        className="p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                      >
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {meeting.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDateTime(meeting.meetingDate)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notifications List */}
        {filteredNotifications && filteredNotifications.length > 0 ? (
          <div className="space-y-2">
            {filteredNotifications.map((notification: any) => (
              <div
                key={notification.id}
                className={`bg-white rounded-lg border p-4 transition-all ${
                  notification.read
                    ? 'border-gray-200'
                    : 'border-blue-200 bg-blue-50'
                } hover:shadow-md cursor-pointer`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-4">
                  <div className="text-2xl flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {notification.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDateTime(notification.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!notification.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              markAsReadMutation.mutate(notification.id)
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Mark as read"
                          >
                            <Check size={16} />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteMutation.mutate(notification.id)
                          }}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Bell size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No notifications
            </h3>
            <p className="text-gray-500">
              {filter === 'unread'
                ? "You're all caught up!"
                : 'No notifications yet'}
            </p>
          </div>
        )}
      </div>
    </Layout>
  )
}
