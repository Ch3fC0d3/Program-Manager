import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import Layout from '@/components/Layout'
import { Calendar as CalendarIcon, List, CheckSquare, Users, Bell, Clock, Plus } from 'lucide-react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import toast from 'react-hot-toast'
import { formatDate, formatDateTime } from '@/lib/utils'

type CalendarEvent = {
  id: string
  title: string
  date: Date
  type: 'task' | 'task_created' | 'meeting' | 'reminder'
  status?: string
  priority?: string
  link?: string
  color: string
  icon: string
}

export default function CalendarView() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [view, setView] = useState<'month' | 'list'>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showNewTask, setShowNewTask] = useState(false)

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

    // Task creation dates (backdated entries)
    ...(tasks?.map((task: any) => ({
      id: `${task.id}-created`,
      title: `Created: ${task.title}`,
      date: new Date(task.createdAt),
      type: 'task_created' as const,
      link: `/tasks/${task.id}`,
      color: 'bg-gray-100 text-gray-700 border-gray-300',
      icon: '🗓️'
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
            <Button onClick={() => setShowNewTask(true)}>
              <Plus size={16} className="mr-1" />
              New Task
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
                const hasTaskCreates = dayEvents.some((e: CalendarEvent) => e.type === 'task_created')
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
                        {hasTasks && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" title="Tasks Due" />}
                        {hasTaskCreates && <div className="w-1.5 h-1.5 bg-gray-500 rounded-full" title="Tasks Created" />}
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
                            event.type === 'task_created' ? 'bg-gray-100 text-gray-700' :
                            event.type === 'meeting' ? 'bg-purple-100 text-purple-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {event.type === 'task' ? 'Task Due' : event.type === 'task_created' ? 'Task Created' : event.type === 'meeting' ? 'Meeting' : 'Reminder'}
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

      {/* New Task Modal */}
      {showNewTask && (
        <NewTaskModal
          onClose={() => setShowNewTask(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] })
            setShowNewTask(false)
          }}
        />
      )}
    </Layout>
  )
}

function NewTaskModal({
  onClose,
  onSuccess
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [boardId, setBoardId] = useState('')
  const [status, setStatus] = useState('BACKLOG')
  const [priority, setPriority] = useState('MEDIUM')
  const [dueDate, setDueDate] = useState('')
  const [assigneeId, setAssigneeId] = useState('')

  // Fetch user's boards
  const { data: boards } = useQuery({
    queryKey: ['user-boards'],
    queryFn: async () => {
      const { data } = await axios.get('/api/boards')
      return data
    }
  })

  // Fetch board members when board is selected
  const { data: board } = useQuery({
    queryKey: ['board', boardId],
    queryFn: async () => {
      const { data } = await axios.get(`/api/boards/${boardId}`)
      return data
    },
    enabled: !!boardId
  })

  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await axios.post('/api/tasks', data)
      return response.data
    },
    onSuccess: () => {
      toast.success('Task created')
      onSuccess()
    },
    onError: () => {
      toast.error('Failed to create task')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!boardId) {
      toast.error('Please select a board')
      return
    }
    createTaskMutation.mutate({
      title,
      description,
      boardId,
      status,
      priority,
      dueDate: dueDate || null,
      assigneeId: assigneeId || null
    })
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Create New Task"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title || !boardId || createTaskMutation.isPending}>
            {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Board <span className="text-red-500">*</span>
          </label>
          <select
            value={boardId}
            onChange={(e) => setBoardId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select a board</option>
            {boards?.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Task description"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="BACKLOG">Backlog</option>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!boardId}
            >
              <option value="">Unassigned</option>
              {board?.members?.map((member: any) => (
                <option key={member.user.id} value={member.user.id}>
                  {member.user.name || member.user.email}
                </option>
              ))}
            </select>
          </div>
        </div>
      </form>
    </Modal>
  )
}
