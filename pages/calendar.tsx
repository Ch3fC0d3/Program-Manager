import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import Layout from '@/components/Layout'
import { Calendar as CalendarIcon, List, CheckSquare, Users, Bell, Clock } from 'lucide-react'
import Button from '@/components/ui/Button'
import { formatDate, formatDateTime } from '@/lib/utils'

type CalendarEvent = {
  id: string
  title: string
  date: Date
  type: 'task' | 'meeting' | 'reminder'
  status?: string
  priority?: string
  link?: string
  color: string
  icon: string
}

export default function CalendarView() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [view, setView] = useState<'month' | 'list'>('month')
  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Fetch tasks
  const { data: tasks } = useQuery({
    queryKey: ['calendar-tasks'],
    queryFn: async () => {
      const { data } = await axios.get('/api/tasks')
      return data
    },
    enabled: !!session
  })

  // Fetch meetings
  const { data: meetings } = useQuery({
    queryKey: ['calendar-meetings'],
    queryFn: async () => {
      const { data } = await axios.get('/api/meetings')
      return data
    },
    enabled: !!session
  })

  // Fetch reminders (tasks due soon)
  const { data: reminders } = useQuery({
    queryKey: ['calendar-reminders'],
    queryFn: async () => {
      const { data } = await axios.get('/api/tasks/reminders')
      return data
    },
    enabled: !!session
  })

  // Combine all events
  const allEvents: CalendarEvent[] = [
    // Tasks with due dates
    ...(tasks?.filter((t: any) => t.dueDate).map((task: any) => ({
      id: task.id,
      title: task.title,
      date: new Date(task.dueDate),
      type: 'task' as const,
      status: task.status,
      priority: task.priority,
      link: `/tasks/${task.id}`,
      color: task.priority === 'URGENT' ? 'bg-red-100 text-red-700 border-red-300' : 
             task.priority === 'HIGH' ? 'bg-orange-100 text-orange-700 border-orange-300' :
             'bg-blue-100 text-blue-700 border-blue-300',
      icon: '📋'
    })) || []),
    
    // Meetings
    ...(meetings?.map((meeting: any) => ({
      id: meeting.id,
      title: meeting.title,
      date: new Date(meeting.meetingDate),
      type: 'meeting' as const,
      link: `/meetings/${meeting.id}`,
      color: 'bg-purple-100 text-purple-700 border-purple-300',
      icon: '👥'
    })) || []),
    
    // Reminders (tasks due within 3 days)
    ...(reminders?.map((reminder: any) => ({
      id: `reminder-${reminder.id}`,
      title: `⏰ ${reminder.title}`,
      date: new Date(reminder.dueDate),
      type: 'reminder' as const,
      link: `/tasks/${reminder.id}`,
      color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      icon: '⏰'
    })) || [])
  ]

  // Group events by date
  const eventsByDate = allEvents.reduce((acc: any, event: CalendarEvent) => {
    const dateStr = event.date.toDateString()
    if (!acc[dateStr]) acc[dateStr] = []
    acc[dateStr].push(event)
    return acc
  }, {})

  // Generate calendar days
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()

  const calendarDays = []
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(new Date(year, month, i))
  }

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  if (status === 'loading') {
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Tasks</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Meetings</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>Reminders</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant={view === 'month' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setView('month')}
            >
              <CalendarIcon size={16} className="mr-1" />
              Month
            </Button>
            <Button
              variant={view === 'list' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setView('list')}
            >
              <List size={16} className="mr-1" />
              List
            </Button>
          </div>
        </div>

        {view === 'month' ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <Button variant="outline" onClick={previousMonth}>
                Previous
              </Button>
              <h2 className="text-xl font-semibold">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <Button variant="outline" onClick={nextMonth}>
                Next
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center font-semibold text-gray-700 py-2">
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {calendarDays.map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} className="aspect-square" />
                }

                const dateStr = day.toDateString()
                const dayEvents = eventsByDate[dateStr] || []
                const isToday = day.toDateString() === new Date().toDateString()
                const hasTasks = dayEvents.some((e: CalendarEvent) => e.type === 'task')
                const hasMeetings = dayEvents.some((e: CalendarEvent) => e.type === 'meeting')
                const hasReminders = dayEvents.some((e: CalendarEvent) => e.type === 'reminder')

                return (
                  <div
                    key={index}
                    className={`aspect-square border rounded-lg p-2 relative ${
                      isToday ? 'bg-blue-50 border-blue-500' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-medium">{day.getDate()}</div>
                      <div className="flex gap-0.5">
                        {hasTasks && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" title="Tasks" />}
                        {hasMeetings && <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" title="Meetings" />}
                        {hasReminders && <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full" title="Reminders" />}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event: CalendarEvent) => (
                        <div
                          key={event.id}
                          onClick={() => event.link && router.push(event.link)}
                          className={`text-xs px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 border ${event.color}`}
                          title={event.title}
                        >
                          <span className="mr-0.5">{event.icon}</span>
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200">
            {/* List View */}
            <div className="divide-y">
              {allEvents
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .map((event) => (
                  <div
                    key={event.id}
                    onClick={() => event.link && router.push(event.link)}
                    className="p-4 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-2xl">{event.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900">{event.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            event.type === 'task' ? 'bg-blue-100 text-blue-700' :
                            event.type === 'meeting' ? 'bg-purple-100 text-purple-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {event.type === 'task' ? 'Task' : event.type === 'meeting' ? 'Meeting' : 'Reminder'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                          <Clock size={14} />
                          <span>{formatDateTime(event.date)}</span>
                          {event.status && (
                            <>
                              <span>•</span>
                              <span className={event.status === 'DONE' ? 'text-green-600' : ''}>
                                {event.status.replace('_', ' ')}
                              </span>
                            </>
                          )}
                          {event.priority && (
                            <>
                              <span>•</span>
                              <span className={
                                event.priority === 'URGENT' ? 'text-red-600 font-medium' :
                                event.priority === 'HIGH' ? 'text-orange-600' : ''
                              }>
                                {event.priority}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              {allEvents.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No events scheduled
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
