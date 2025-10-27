import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import Layout from '@/components/Layout'
import TaskCard from '@/components/TaskCard'
import IntakeCard from '@/components/IntakeCard'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import BoardMembersModal from '@/components/BoardMembersModal'
import { Plus, Filter, Download, Upload, Sparkles, Check, X, Users, Archive, ArchiveRestore } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import CsvImportDropzone from '@/components/CsvImportDropzone'
import { useTaskDragDrop } from '@/hooks/useTaskDragDrop'

const STATUSES = [
  { value: 'BACKLOG', label: 'Backlog', color: 'bg-gray-500' },
  { value: 'NEXT_7_DAYS', label: 'Next 7 Days', color: 'bg-blue-500' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-yellow-500' },
  { value: 'BLOCKED', label: 'Blocked', color: 'bg-red-500' },
  { value: 'DONE', label: 'Done', color: 'bg-green-500' },
]

const INTAKE_STATUSES = [
  { value: 'INBOX', label: 'Inbox', color: 'bg-purple-500' },
  { value: 'SUGGESTED', label: 'Suggested', color: 'bg-indigo-500' }
]

const toLocalDateTimeInput = (date: Date) => {
  const tzOffset = date.getTimezoneOffset() * 60000
  const localISOTime = new Date(date.getTime() - tzOffset).toISOString()
  return localISOTime.slice(0, 16)
}

export default function BoardView() {
  const router = useRouter()
  const { id } = router.query
  const { data: session, status } = useSession()
  const queryClient = useQueryClient()
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTaskStatus, setNewTaskStatus] = useState('BACKLOG')
  const [showImportModal, setShowImportModal] = useState(false)
  const [showMembersModal, setShowMembersModal] = useState(false)

  const { draggedTask, handleDragStart, handleDropOnCard, handleDropOnColumn } = useTaskDragDrop([
    ['board', id as string],
    ['board', id as string, 'intake']
  ])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const { data: board, isLoading } = useQuery({
    queryKey: ['board', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/boards/${id}`)
      return data
    },
    enabled: !!id && !!session
  })

  const { data: intakeCards, isLoading: isIntakeLoading } = useQuery({
    queryKey: ['board', id, 'intake'],
    queryFn: async () => {
      const { data } = await axios.get('/api/cards', {
        params: {
          boardId: id
        }
      })
      return data
    },
    enabled: !!id && !!session
  })

  const suggestionMutation = useMutation({
    mutationFn: async ({ cardId, action }: { cardId: string; action: 'accept' | 'reject' }) => {
      if (action === 'accept') {
        await axios.post(`/api/cards/${cardId}/accept-suggestion`)
      } else {
        await axios.post(`/api/cards/${cardId}/reject-suggestion`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', id, 'intake'] })
      queryClient.invalidateQueries({ queryKey: ['board', id] })
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.status && [400, 409].includes(error.response.status)) {
        const message = (error.response.data as { message?: string })?.message || 'Suggestion already processed. Refreshing...'
        toast(message)
        queryClient.invalidateQueries({ queryKey: ['board', id, 'intake'] })
      } else {
        toast.error('Failed to update AI suggestion')
      }
    }
  })

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleExport = async () => {
    try {
      const response = await axios.get(`/api/tasks/export?boardId=${id}`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `tasks-${id}-${Date.now()}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Tasks exported')
    } catch (error) {
      toast.error('Failed to export tasks')
    }
  }

  const archiveMutation = useMutation({
    mutationFn: async (archive: boolean) => {
      if (archive) {
        await axios.post(`/api/boards/${id}/archive`)
      } else {
        await axios.delete(`/api/boards/${id}/archive`)
      }
    },
    onSuccess: (_, archive) => {
      queryClient.invalidateQueries({ queryKey: ['board', id] })
      queryClient.invalidateQueries({ queryKey: ['boards'] })
      toast.success(archive ? 'Board archived' : 'Board unarchived')
      router.push('/boards')
    },
    onError: () => {
      toast.error('Failed to update board')
    }
  })

  const handleArchiveToggle = () => {
    const isArchived = !!board?.archivedAt
    const message = isArchived 
      ? 'Are you sure you want to unarchive this board?' 
      : 'Are you sure you want to archive this board? It will be hidden from your active boards list.'
    
    if (confirm(message)) {
      archiveMutation.mutate(!isArchived)
    }
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  const tasksByStatus = STATUSES.reduce((acc, status) => {
    acc[status.value] = board?.tasks?.filter((t: any) => t.status === status.value) || []
    return acc
  }, {} as Record<string, any[]>)

  const intakeByStatus = INTAKE_STATUSES.reduce((acc, status) => {
    acc[status.value] = intakeCards?.filter((card: any) => card.intakeStatus === status.value) || []
    return acc
  }, {} as Record<string, any[]>)

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{board?.name}</h1>
            {board?.description && (
              <p className="text-gray-600 mt-1">{board.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleArchiveToggle}
              disabled={archiveMutation.isPending}
              className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 transition-colors"
            >
              {board?.archivedAt ? 'Unarchive' : 'Archive'}
            </button>
            <Button variant="outline" onClick={() => setShowMembersModal(true)}>
              <Users size={20} className="mr-2" />
              Members
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download size={20} className="mr-2" />
              Export
            </Button>
            <Button variant="outline" onClick={() => setShowImportModal(true)}>
              <Upload size={20} className="mr-2" />
              Import
            </Button>
            <Button onClick={() => setShowNewTask(true)}>
              <Plus size={20} className="mr-2" />
              New Task
            </Button>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4">
          {/* Intake Columns */}
          {isIntakeLoading ? (
            <div className="flex items-center justify-center w-48 h-40 rounded-lg border border-dashed border-purple-200">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500" />
            </div>
          ) : (
            INTAKE_STATUSES.map((status) => (
              <div
                key={`intake-${status.value}`}
                className="flex-shrink-0 w-64"
              >
                <div className="bg-white rounded-lg border border-gray-200 mb-3 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-3 h-3 rounded-full', status.color)} />
                      <h3 className="font-semibold text-gray-900">{status.label}</h3>
                    </div>
                    <span className="text-sm text-gray-500">{intakeByStatus[status.value].length}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">AI suggestions pending review</p>
                </div>

                <div className="space-y-3 min-h-[200px]">
                  {intakeByStatus[status.value].map((card: any) => (
                    <IntakeCard
                      key={card.id}
                      card={card}
                      onAccept={() => suggestionMutation.mutate({ cardId: card.id, action: 'accept' })}
                      onReject={() => suggestionMutation.mutate({ cardId: card.id, action: 'reject' })}
                      isProcessing={suggestionMutation.isPending}
                      onOpen={() => router.push(`/tasks/${card.id}`)}
                    />
                  ))}
                  {intakeByStatus[status.value].length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      No cards
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Kanban Board */}
          {STATUSES.map((status) => (
            <div
              key={status.value}
              className="flex-shrink-0 w-40"
              onDragOver={handleDragOver}
              onDrop={() => handleDropOnColumn(status.value)}
            >
              {/* Column Header */}
              <div className="bg-white rounded-lg border border-gray-200 mb-3 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-3 h-3 rounded-full', status.color)} />
                    <h3 className="font-semibold text-gray-900">{status.label}</h3>
                  </div>
                  <span className="text-sm text-gray-500">
                    {tasksByStatus[status.value].length}
                  </span>
                </div>
              </div>

              {/* Tasks */}
              <div className="space-y-3 min-h-[200px]">
                {tasksByStatus[status.value].map((task: any) => (
                  <div
                    key={task.id}
                    className="w-40"
                  >
                    <div className="w-full aspect-square">
                      <TaskCard
                        task={task}
                        onClick={() => router.push(`/tasks/${task.id}`)}
                        draggable
                        onDropOnCard={handleDropOnCard}
                        onDragStartCallback={handleDragStart}
                        className="h-full"
                      />
                    </div>
                  </div>
                ))}
                {tasksByStatus[status.value].length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    No tasks
                  </div>
                )}
              </div>

              {/* Add Task Button */}
              <button
                onClick={() => {
                  setNewTaskStatus(status.value)
                  setShowNewTask(true)
                }}
                className="w-full mt-3 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors"
              >
                <Plus size={20} className="mx-auto" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Import CSV Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Tasks from CSV"
        size="lg"
        footer={
          <Button variant="outline" onClick={() => setShowImportModal(false)}>
            Close
          </Button>
        }
      >
        <p className="text-sm text-gray-600 mb-4">
          Upload a CSV exported from ClickUp, Notion, or another project tool. We&apos;ll map the columns where possible.
        </p>
        <CsvImportDropzone
          onUpload={async (file) => {
            if (!id) throw new Error('Board ID missing')

            const data = new FormData()
            data.append('file', file)
            data.append('boardId', id as string)

            const response = await axios.post('/api/tasks/import', data)
            const summary = response.data

            toast.success(`Imported ${summary.imported} tasks${summary.errors ? ` with ${summary.errors} issues` : ''}`)
            await queryClient.invalidateQueries({ queryKey: ['board', id] })
            await queryClient.invalidateQueries({ queryKey: ['tasks'] })
            setShowImportModal(false)
          }}
        />
        <div className="mt-4 text-xs text-gray-500 space-y-2">
          <p>Required column: <code className="bg-gray-100 px-1 py-0.5 rounded">Title</code></p>
          <p>Optional columns: <code className="bg-gray-100 px-1 py-0.5 rounded">Description</code>, <code className="bg-gray-100 px-1 py-0.5 rounded">Status</code>, <code className="bg-gray-100 px-1 py-0.5 rounded">Priority</code>, <code className="bg-gray-100 px-1 py-0.5 rounded">Assignee</code>, <code className="bg-gray-100 px-1 py-0.5 rounded">Start Date</code>, <code className="bg-gray-100 px-1 py-0.5 rounded">Due Date</code></p>
        </div>
      </Modal>

      {/* Board Members Modal */}
      {showMembersModal && (
        <BoardMembersModal
          boardId={id as string}
          isOpen={showMembersModal}
          onClose={() => setShowMembersModal(false)}
        />
      )}

      {/* New Task Modal */}
      {showNewTask && (
        <NewTaskModal
          boardId={id as string}
          initialStatus={newTaskStatus}
          onClose={() => setShowNewTask(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['board', id] })
            setShowNewTask(false)
          }}
        />
      )}
    </Layout>
  )
}

function NewTaskModal({
  boardId,
  initialStatus,
  onClose,
  onSuccess
}: {
  boardId: string
  initialStatus: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState(initialStatus)
  const [priority, setPriority] = useState('MEDIUM')
  const [dueDate, setDueDate] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [createdAtInput, setCreatedAtInput] = useState(toLocalDateTimeInput(new Date()))
  const [labelIds, setLabelIds] = useState<string[]>([])
  const [duplicates, setDuplicates] = useState<any[]>([])

  // Fetch board members for assignee dropdown
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
    onSuccess: (data) => {
      if (data.duplicates && data.duplicates.length > 0) {
        setDuplicates(data.duplicates)
        toast.success(`Task created! Found ${data.duplicates.length} similar task(s)`, {
          duration: 5000,
          icon: '⚠️'
        })
      } else {
        toast.success('Task created')
        onSuccess()
      }
    },
    onError: () => {
      toast.error('Failed to create task')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createTaskMutation.mutate({
      title,
      description,
      boardId,
      status,
      priority,
      dueDate: dueDate || null,
      assigneeId: assigneeId || null,
      createdAt: createdAtInput ? new Date(createdAtInput).toISOString() : undefined,
      labelIds
    })
  }

  const toggleLabel = (id: string) => {
    setLabelIds((prev) =>
      prev.includes(id) ? prev.filter((labelId) => labelId !== id) : [...prev, id]
    )
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={duplicates.length > 0 ? 'Similar Tasks Found!' : 'Create New Task'}
      footer={
        duplicates.length > 0 ? (
          <>
            <Button variant="outline" onClick={() => { setDuplicates([]); onSuccess(); }}>
              Close
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!title || createTaskMutation.isPending}>
              {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </>
        )
      }
    >
      {duplicates.length > 0 ? (
        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-orange-800 mb-3">
              Your task was created, but we found {duplicates.length} similar task(s). You may want to review them to avoid duplicate work.
            </p>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {duplicates.map((dup: any) => (
              <a
                key={dup.id}
                href={`/tasks/${dup.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white border border-orange-200 rounded-lg p-3 hover:border-orange-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {dup.title}
                      </span>
                      <span className={cn(
                        'px-2 py-0.5 text-xs rounded-full flex-shrink-0',
                        dup.similarity >= 80 ? 'bg-red-100 text-red-700' :
                        dup.similarity >= 60 ? 'bg-orange-100 text-orange-700' :
                        'bg-yellow-100 text-yellow-700'
                      )}>
                        {dup.similarity}% match
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="truncate">{dup.board?.name}</span>
                      {dup.assignee && (
                        <>
                          <span>•</span>
                          <span className="truncate">{dup.assignee.name}</span>
                        </>
                      )}
                      <span>•</span>
                      <span className="capitalize">{dup.status.replace('_', ' ').toLowerCase()}</span>
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter task title"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter task description"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={STATUSES.map(s => ({ value: s.value, label: s.label }))}
          />

          <Select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            options={[
              { value: 'LOW', label: 'Low' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'HIGH', label: 'High' },
              { value: 'URGENT', label: 'Urgent' }
            ]}
          />
        </div>

        <Input
          label="Due Date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        <Input
          label="Created On"
          type="datetime-local"
          value={createdAtInput}
          onChange={(e) => setCreatedAtInput(e.target.value)}
          required
        />

        <Select
          label="Assign To"
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          options={[
            { value: '', label: 'Unassigned' },
            ...(board?.members?.map((member: any) => ({
              value: member.user.id,
              label: member.user.name || member.user.email
            })) || [])
          ]}
        />

        {Array.isArray(board?.labels) && board.labels.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Labels</p>
            <div className="flex flex-wrap gap-2">
              {board.labels.map((label: any) => {
                const isSelected = labelIds.includes(label.id)
                return (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => toggleLabel(label.id)}
                    className={cn(
                      'px-3 py-1 rounded-full text-sm border transition-colors',
                      isSelected
                        ? 'border-blue-500 text-blue-700 bg-blue-50'
                        : 'border-gray-200 text-gray-600 hover:border-blue-200'
                    )}
                  >
                    {label.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </form>
      )}
    </Modal>
  )
}
