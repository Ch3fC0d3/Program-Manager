import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import Layout from '@/components/Layout'
import TaskCard from '@/components/TaskCard'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import { Plus, Search, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTaskDragDrop } from '@/hooks/useTaskDragDrop'

export default function TasksPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [assigneeFilter, setAssigneeFilter] = useState('ALL')
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null)

  const { draggedTask, handleDragStart, handleDropOnCard, handleDropOnColumn } = useTaskDragDrop([['tasks']])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', statusFilter, assigneeFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL') params.append('status', statusFilter)
      if (assigneeFilter === 'MY_TASKS') {
        params.append('assigneeId', session?.user?.id || '')
      } else if (assigneeFilter !== 'ALL') {
        params.append('assigneeId', assigneeFilter)
      }
      // Only show top-level tasks (not subtasks)
      params.append('parentId', 'null')
      
      const { data } = await axios.get(`/api/tasks?${params.toString()}`)
      return data
    },
    enabled: !!session
  })

  const { data: boards } = useQuery({
    queryKey: ['boards'],
    queryFn: async () => {
      const { data } = await axios.get('/api/boards')
      return data
    },
    enabled: !!session
  })

  const handleDragEnd = () => {
    setDragOverStatus(null)
  }

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault()
    setDragOverStatus(status)
  }

  const handleDragLeave = () => {
    setDragOverStatus(null)
  }

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    handleDropOnColumn(newStatus)
    setDragOverStatus(null)
  }

  if (status === 'loading' || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  // Get unique assignees from all boards
  const allAssignees = boards?.flatMap((board: any) => 
    board.members.map((m: any) => m.user)
  ).filter((user: any, index: number, self: any[]) => 
    index === self.findIndex((u) => u.id === user.id)
  ) || []

  // Filter tasks by search query
  const filteredTasks = tasks?.filter((task: any) => {
    if (!searchQuery) return true
    return task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           task.description?.toLowerCase().includes(searchQuery.toLowerCase())
  }) || []

  // Group tasks by status
  const tasksByStatus = {
    BACKLOG: filteredTasks.filter((t: any) => t.status === 'BACKLOG'),
    NEXT_7_DAYS: filteredTasks.filter((t: any) => t.status === 'NEXT_7_DAYS'),
    IN_PROGRESS: filteredTasks.filter((t: any) => t.status === 'IN_PROGRESS'),
    BLOCKED: filteredTasks.filter((t: any) => t.status === 'BLOCKED'),
    DONE: filteredTasks.filter((t: any) => t.status === 'DONE'),
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">All Tasks</h1>
            <p className="text-gray-600 mt-1">
              {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={() => router.push('/boards')}>
            <Plus size={20} className="mr-2" />
            New Task
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'BACKLOG', label: 'Backlog' },
                { value: 'NEXT_7_DAYS', label: 'Next 7 Days' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'BLOCKED', label: 'Blocked' },
                { value: 'DONE', label: 'Done' },
              ]}
            />

            {/* Assignee Filter */}
            <Select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Assignees' },
                { value: 'MY_TASKS', label: 'My Tasks' },
                ...allAssignees.map((user: any) => ({
                  value: user.id,
                  label: user.name
                }))
              ]}
            />
          </div>
        </div>

        {/* Tasks Grid */}
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">No tasks found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(tasksByStatus).map(([status, statusTasks]: [string, any]) => {
              const statusLabels: Record<string, string> = {
                BACKLOG: 'Backlog',
                NEXT_7_DAYS: 'Next 7 Days',
                IN_PROGRESS: 'In Progress',
                BLOCKED: 'Blocked',
                DONE: 'Done',
              }

              return (
                <div key={status}>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">
                    {statusLabels[status]} ({statusTasks.length})
                  </h2>
                  <div
                    className={cn(
                      'grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 p-4 rounded-lg border-2 border-dashed transition-colors min-h-[200px]',
                      dragOverStatus === status
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-transparent'
                    )}
                    onDragOver={(e) => handleDragOver(e, status)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, status)}
                  >
                    {statusTasks.map((task: any) => (
                      <div
                        key={task.id}
                        className={cn(
                          'transition-opacity',
                          draggedTask === task.id && 'opacity-50'
                        )}
                      >
                        <TaskCard
                          task={task}
                          onClick={() => router.push(`/tasks/${task.id}`)}
                          draggable
                          onDropOnCard={handleDropOnCard}
                          onDragStartCallback={handleDragStart}
                        />
                      </div>
                    ))}
                    {statusTasks.length === 0 && (
                      <div className="col-span-full text-center text-gray-400 py-8">
                        Drop tasks here
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
