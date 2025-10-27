import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import Layout from '@/components/Layout'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import TaskCard from '@/components/TaskCard'
import {
  Calendar,
  User,
  Tag,
  Paperclip,
  MessageSquare,
  CheckSquare,
  Clock,
  AlertCircle,
  Trash2,
  Edit,
  Plus,
  Sparkles,
  Check,
  X
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDateTime, cn } from '@/lib/utils'
import { useTaskDragDrop } from '@/hooks/useTaskDragDrop'

export default function TaskDetail() {
  const router = useRouter()
  const { id } = router.query
  const { data: session, status } = useSession()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [showChecklistModal, setShowChecklistModal] = useState(false)
  const [metadata, setMetadata] = useState({
    status: '',
    priority: '',
    dueDate: '',
    assigneeId: '',
    createdAt: ''
  })

  const { draggedTask, handleDragStart, handleDropOnCard } = useTaskDragDrop([['task', id as string]])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/tasks/${id}`)
      return data
    },
    enabled: !!id && !!session
  })

  const { data: aiSuggestion, isLoading: isSuggestionLoading } = useQuery({
    queryKey: ['task', id, 'ai-suggestion'],
    queryFn: async () => {
      const { data } = await axios.get(`/api/cards/${id}/suggestion`)
      return data
    },
    enabled: !!id && !!session
  })

  const updateTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await axios.put(`/api/tasks/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] })
      toast.success('Task updated')
      setIsEditing(false)
    },
    onError: () => {
      toast.error('Failed to update task')
    }
  })

  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      await axios.delete(`/api/tasks/${id}`)
    },
    onSuccess: () => {
      toast.success('Task deleted')
      router.push(`/boards/${task.boardId}`)
    },
    onError: () => {
      toast.error('Failed to delete task')
    }
  })

  const suggestionMutation = useMutation({
    mutationFn: async ({ action }: { action: 'accept' | 'reject' }) => {
      if (action === 'accept') {
        await axios.post(`/api/cards/${id}/accept-suggestion`)
      } else {
        await axios.post(`/api/cards/${id}/reject-suggestion`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] })
      queryClient.invalidateQueries({ queryKey: ['task', id, 'ai-suggestion'] })
      toast.success('Suggestion updated')
    },
    onError: () => {
      toast.error('Failed to update suggestion')
    }
  })

  useEffect(() => {
    if (task) {
      setMetadata({
        status: task.status || '',
        priority: task.priority || '',
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
        assigneeId: task.assigneeId || '',
        createdAt: task.createdAt ? new Date(task.createdAt).toISOString().slice(0, 16) : ''
      })
    }
  }, [task])

  const hasMetadataChanges = useMemo(() => {
    if (!task) {
      return false
    }

    const dueDateValue = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
    const createdAtValue = task.createdAt ? new Date(task.createdAt).toISOString().slice(0, 16) : ''

    return (
      metadata.status !== task.status ||
      metadata.priority !== task.priority ||
      metadata.assigneeId !== (task.assigneeId || '') ||
      metadata.dueDate !== dueDateValue ||
      metadata.createdAt !== createdAtValue
    )
  }, [metadata, task])

  const handleMetadataChange = (field: 'status' | 'priority' | 'dueDate' | 'assigneeId' | 'createdAt', value: string) => {
    setMetadata((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSaveMetadata = () => {
    if (!task || !hasMetadataChanges) {
      return
    }

    updateTaskMutation.mutate({
      status: metadata.status,
      priority: metadata.priority,
      dueDate: metadata.dueDate || null,
      assigneeId: metadata.assigneeId || null,
      createdAt: metadata.createdAt ? new Date(metadata.createdAt).toISOString() : undefined
    })
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

  if (!task) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">Task not found</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          {aiSuggestion?.intakeStatus && ['INBOX', 'SUGGESTED'].includes(aiSuggestion.intakeStatus) && (
            <div className="mb-4 p-4 border border-purple-200 rounded-lg bg-purple-50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-purple-700 font-semibold">
                    <Sparkles size={18} />
                    <span>AI Suggestion Available</span>
                    {typeof aiSuggestion.aiConfidence === 'number' && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                        Confidence {Math.round(aiSuggestion.aiConfidence * 100)}%
                      </span>
                    )}
                  </div>
                  {aiSuggestion.aiSummary && (
                    <p className="text-sm text-purple-900 mt-2">{aiSuggestion.aiSummary}</p>
                  )}
                  {aiSuggestion.suggestedParent && (
                    <p className="text-xs text-purple-700 mt-2">
                      Suggested Parent: {aiSuggestion.suggestedParent.title}
                    </p>
                  )}
                  {Array.isArray(aiSuggestion.aiLabels) && aiSuggestion.aiLabels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {aiSuggestion.aiLabels.map((label: string) => (
                        <span key={label} className="text-xs bg-white text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 w-40">
                  <Button
                    onClick={() => suggestionMutation.mutate({ action: 'accept' })}
                    disabled={suggestionMutation.isPending || isSuggestionLoading}
                    className="flex items-center justify-center gap-2"
                  >
                    <Check size={16} />
                    Accept
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => suggestionMutation.mutate({ action: 'reject' })}
                    disabled={suggestionMutation.isPending || isSuggestionLoading}
                    className="flex items-center justify-center gap-2"
                  >
                    <X size={16} />
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          )}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              {isEditing ? (
                <Input
                  defaultValue={task.title}
                  onBlur={(e) => updateTaskMutation.mutate({ title: e.target.value })}
                  className="text-2xl font-bold"
                />
              ) : (
                <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
              )}
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                <span>in</span>
                <span className="font-medium text-blue-600">{task.board.name}</span>
                <span>•</span>
                <span>Created {formatDateTime(task.createdAt)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit size={16} className="mr-1" />
                {isEditing ? 'Done' : 'Edit'}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this task?')) {
                    deleteTaskMutation.mutate()
                  }
                }}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-gray-500 uppercase">Status</label>
              <Select
                value={metadata.status}
                onChange={(e) => handleMetadataChange('status', e.target.value)}
                options={[
                  { value: 'BACKLOG', label: 'Backlog' },
                  { value: 'NEXT_7_DAYS', label: 'Next 7 Days' },
                  { value: 'IN_PROGRESS', label: 'In Progress' },
                  { value: 'BLOCKED', label: 'Blocked' },
                  { value: 'DONE', label: 'Done' }
                ]}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 uppercase">Priority</label>
              <Select
                value={metadata.priority}
                onChange={(e) => handleMetadataChange('priority', e.target.value)}
                options={[
                  { value: 'LOW', label: 'Low' },
                  { value: 'MEDIUM', label: 'Medium' },
                  { value: 'HIGH', label: 'High' },
                  { value: 'URGENT', label: 'Urgent' }
                ]}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 uppercase">Due Date</label>
              <Input
                type="date"
                value={metadata.dueDate}
                onChange={(e) => handleMetadataChange('dueDate', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 uppercase">Created On</label>
              <Input
                type="datetime-local"
                value={metadata.createdAt}
                onChange={(e) => handleMetadataChange('createdAt', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 uppercase">Assignee</label>
              <Select
                value={metadata.assigneeId}
                onChange={(e) => handleMetadataChange('assigneeId', e.target.value)}
                options={[
                  { value: '', label: 'Unassigned' },
                  ...(task.board?.members?.map((member: any) => ({
                    value: member.user.id,
                    label: member.user.name || member.user.email
                  })) || [])
                ]}
                className="mt-1"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSaveMetadata} disabled={!hasMetadataChanges || updateTaskMutation.isPending}>
              Save changes
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Description</h2>
              {isEditing ? (
                <textarea
                  defaultValue={task.description || ''}
                  onBlur={(e) => updateTaskMutation.mutate({ description: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-700 whitespace-pre-wrap">
                  {task.description || 'No description provided'}
                </p>
              )}
            </div>

            {/* Checklists */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Checklists</h2>
                <Button size="sm" onClick={() => setShowChecklistModal(true)}>
                  <Plus size={16} className="mr-1" />
                  Add
                </Button>
              </div>
              {task.checklists?.length > 0 ? (
                <div className="space-y-4">
                  {task.checklists.map((checklist: any) => (
                    <ChecklistComponent key={checklist.id} checklist={checklist} taskId={task.id} />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No checklists yet</p>
              )}
            </div>

            {/* Comments */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Comments</h2>
                <Button size="sm" onClick={() => setShowCommentModal(true)}>
                  <Plus size={16} className="mr-1" />
                  Add
                </Button>
              </div>
              {task.comments?.length > 0 ? (
                <div className="space-y-4">
                  {task.comments.map((comment: any) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                        {comment.user.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{comment.user.name}</span>
                          <span className="text-xs text-gray-500">
                            {formatDateTime(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No comments yet</p>
              )}
            </div>

            {/* Activity */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Activity</h2>
              {task.activities?.length > 0 ? (
                <div className="space-y-3">
                  {task.activities.map((activity: any) => (
                    <div key={activity.id} className="flex gap-3 text-sm">
                      <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-xs font-semibold flex-shrink-0">
                        {activity.user.name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-medium">{activity.user.name}</span>
                        <span className="text-gray-600"> {activity.action} </span>
                        <span className="text-gray-500 text-xs">
                          {formatDateTime(activity.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No activity yet</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Attachments */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold mb-3">Attachments</h3>
              {task.attachments?.length > 0 ? (
                <div className="space-y-2">
                  {task.attachments.map((attachment: any) => (
                    <a
                      key={attachment.id}
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded hover:bg-gray-50"
                    >
                      <Paperclip size={16} className="text-gray-400" />
                      <span className="text-sm truncate">{attachment.originalName}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No attachments</p>
              )}
            </div>

            {/* Subtasks */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold mb-3">Subtasks</h3>
              {task.subtasks?.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {task.subtasks.map((subtask: any) => (
                    <div
                      key={subtask.id}
                      className={cn('transition-opacity aspect-square', draggedTask === subtask.id && 'opacity-50')}
                    >
                      <TaskCard
                        task={subtask}
                        onClick={() => router.push(`/tasks/${subtask.id}`)}
                        draggable
                        onDropOnCard={handleDropOnCard}
                        onDragStartCallback={handleDragStart}
                        className="h-full"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No subtasks</p>
              )}
            </div>

            {/* Dependencies */}
            {task.dependencies?.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-semibold mb-3">Blocked By</h3>
                <div className="space-y-2">
                  {task.dependencies.map((dep: any) => (
                    <div key={dep.id} className="text-sm">
                      <a
                        href={`/tasks/${dep.blockingTask.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {dep.blockingTask.title}
                      </a>
                      <span className={cn(
                        'ml-2 text-xs px-2 py-0.5 rounded',
                        dep.blockingTask.status === 'DONE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      )}>
                        {dep.blockingTask.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comment Modal */}
      {showCommentModal && (
        <CommentModal
          taskId={task.id}
          onClose={() => setShowCommentModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['task', id] })
            setShowCommentModal(false)
          }}
        />
      )}

      {/* Checklist Modal */}
      {showChecklistModal && (
        <ChecklistModal
          taskId={task.id}
          onClose={() => setShowChecklistModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['task', id] })
            setShowChecklistModal(false)
          }}
        />
      )}
    </Layout>
  )
}

function ChecklistComponent({ checklist, taskId }: { checklist: any; taskId: string }) {
  const queryClient = useQueryClient()

  const toggleItemMutation = useMutation({
    mutationFn: async ({ itemId, completed }: { itemId: string; completed: boolean }) => {
      const response = await axios.patch(`/api/checklist-items/${itemId}`, { completed })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] })
    },
    onError: () => {
      toast.error('Failed to update item')
    }
  })

  const completed = checklist.items.filter((i: any) => i.completed).length
  const total = checklist.items.length
  const progress = total > 0 ? (completed / total) * 100 : 0

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium">{checklist.title}</h3>
        <span className="text-sm text-gray-500">{completed}/{total}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <div
          className="bg-green-500 h-2 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="space-y-2">
        {checklist.items.map((item: any) => (
          <div key={item.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={item.completed}
              onChange={() => {
                toggleItemMutation.mutate({
                  itemId: item.id,
                  completed: !item.completed
                })
              }}
              disabled={toggleItemMutation.isPending}
              className="w-4 h-4 text-blue-600 rounded cursor-pointer disabled:cursor-not-allowed"
            />
            <span className={cn('text-sm', item.completed && 'line-through text-gray-500')}>
              {item.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CommentModal({ taskId, onClose, onSuccess }: any) {
  const [content, setContent] = useState('')

  const createCommentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await axios.post(`/api/tasks/${taskId}/comments`, data)
      return response.data
    },
    onSuccess: () => {
      toast.success('Comment added')
      onSuccess()
    },
    onError: () => {
      toast.error('Failed to add comment')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createCommentMutation.mutate({ content })
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Add Comment"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!content}>Add Comment</Button>
        </>
      }
    >
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your comment..."
        rows={4}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </Modal>
  )
}

function ChecklistModal({ taskId, onClose, onSuccess }: any) {
  const [title, setTitle] = useState('')
  const [items, setItems] = useState([''])

  const createChecklistMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await axios.post(`/api/tasks/${taskId}/checklists`, data)
      return response.data
    },
    onSuccess: () => {
      toast.success('Checklist added')
      onSuccess()
    },
    onError: () => {
      toast.error('Failed to add checklist')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createChecklistMutation.mutate({
      title,
      items: items.filter(i => i.trim()).map(text => ({ text, completed: false }))
    })
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Add Checklist"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!title}>Add Checklist</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Checklist Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Pre-launch tasks"
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Items</label>
          {items.map((item, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <Input
                value={item}
                onChange={(e) => {
                  const newItems = [...items]
                  newItems[index] = e.target.value
                  setItems(newItems)
                }}
                placeholder="Item text"
              />
              {index === items.length - 1 && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setItems([...items, ''])}
                >
                  <Plus size={16} />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
