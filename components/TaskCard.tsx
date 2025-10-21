import { useState } from 'react'
import Link from 'next/link'
import {
  Calendar,
  MessageSquare,
  Paperclip,
  CheckSquare,
  AlertCircle,
  User,
  LayoutDashboard
} from 'lucide-react'
import { cn, formatDate, getStatusColor, getPriorityColor, isOverdue } from '@/lib/utils'
import Image from 'next/image'
import SubtaskList from './SubtaskList'

interface TaskCardProps {
  task: any
  onClick?: () => void
  draggable?: boolean
  className?: string
  onDropOnCard?: (droppedTaskId: string, targetTaskId: string) => void
  onDragStartCallback?: (taskId: string) => void
}

export default function TaskCard({ task, onClick, draggable = false, className, onDropOnCard, onDragStartCallback }: TaskCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isDropTarget, setIsDropTarget] = useState(false)
  const [justDropped, setJustDropped] = useState(false)

  const handleDragStart = (e: React.DragEvent) => {
    if (!draggable) return
    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('taskId', task.id)
    e.dataTransfer.setData('text/plain', task.id)
    onDragStartCallback?.(task.id)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    if (!onDropOnCard) return
    e.preventDefault()
    e.stopPropagation()
    setIsDropTarget(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation()
    setIsDropTarget(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDropTarget(false)
    
    const droppedTaskId = e.dataTransfer.getData('taskId')
    
    if (droppedTaskId && droppedTaskId !== task.id && onDropOnCard) {
      setJustDropped(true)
      setTimeout(() => setJustDropped(false), 100)
      onDropOnCard(droppedTaskId, task.id)
    }
  }
  
  const handleClick = (e: React.MouseEvent) => {
    if (justDropped) return
    onClick?.()
  }

  const completedSubtasks = task.subtasks?.filter((s: any) => s.status === 'DONE').length || 0
  const totalSubtasks = task.subtasks?.length || task._count?.subtasks || 0

  const statusClasses: Record<string, string> = {
    BACKLOG: 'bg-gray-100 text-gray-700',
    NEXT_7_DAYS: 'bg-blue-100 text-blue-700',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
    BLOCKED: 'bg-red-100 text-red-700',
    DONE: 'bg-emerald-100 text-emerald-700'
  }

  const statusLabels: Record<string, string> = {
    BACKLOG: 'Backlog',
    NEXT_7_DAYS: 'Next 7 Days',
    IN_PROGRESS: 'In Progress',
    BLOCKED: 'Blocked',
    DONE: 'Done'
  }

  const status: string = (task.status || 'BACKLOG') as string
  const statusClass = statusClasses[status] || 'bg-gray-100 text-gray-700'
  const statusLabel = statusLabels[status] || status.replace(/_/g, ' ')

  const commentCount = task._count?.comments ?? 0
  const attachmentCount = task._count?.attachments ?? 0
  const checklistCount = totalSubtasks
  const boardName = task.board?.name
  const boardColor = task.board?.color || '#1D4ED8'

  return (
    <div
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={cn(
        'task-card relative bg-white rounded-md border border-gray-200 border-t-4 p-2 cursor-pointer hover:shadow-md transition-shadow flex flex-col overflow-hidden w-full h-full',
        isDragging && 'opacity-50',
        isDropTarget && 'ring-2 ring-blue-500 ring-offset-2',
        className
      )}
      style={{ borderTopColor: boardColor }}
    >
      <div className="flex flex-col flex-1 gap-1">
        <div className="flex items-start justify-between gap-1">
          <div className="flex flex-wrap gap-1 max-w-[75%]">
            {Array.isArray(task.labels) && task.labels.slice(0, 2).map((tl: any) => (
              <span
                key={tl.label.id}
                className="px-1.5 py-0.5 text-[10px] font-medium rounded"
                style={{
                  backgroundColor: tl.label.color + '20',
                  color: tl.label.color
                }}
              >
                {tl.label.name}
              </span>
            ))}
            {Array.isArray(task.labels) && task.labels.length > 2 && (
              <span className="px-1.5 py-0.5 text-[10px] text-gray-500">
                +{task.labels.length - 2}
              </span>
            )}
          </div>

          <span className={cn('px-2 py-0.5 text-[10px] font-semibold rounded uppercase tracking-wide', statusClass)}>
            {statusLabel}
          </span>
        </div>

        <h3 className="font-semibold text-xs sm:text-sm text-gray-900 leading-tight line-clamp-3">
          {task.title}
        </h3>

        {task.description && (
          <p className="text-[11px] text-gray-600 leading-tight line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="flex items-center justify-between text-[11px] font-medium text-gray-700 bg-gray-50 rounded px-2 py-1">
          <span className="flex items-center gap-2 truncate">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: boardColor }}
            />
            <span className="truncate">{boardName || 'Project'}</span>
          </span>
          <span className="uppercase tracking-wide text-[10px] text-gray-500">Project</span>
        </div>

        <div className="mt-auto space-y-1 text-[10px] text-gray-500">
          {task.dueDate && (
            <div
              className={cn(
                'flex items-center gap-0.5 font-medium',
                isOverdue(task.dueDate) && 'text-red-600'
              )}
            >
              <Calendar size={11} />
              <span>{formatDate(task.dueDate)}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {commentCount > 0 && (
              <span className="flex items-center gap-0.5">
                <MessageSquare size={11} />
                {commentCount}
              </span>
            )}
            {attachmentCount > 0 && (
              <span className="flex items-center gap-0.5">
                <Paperclip size={11} />
                {attachmentCount}
              </span>
            )}
            {checklistCount > 0 && (
              <span className="flex items-center gap-0.5">
                <CheckSquare size={11} />
                {completedSubtasks}/{checklistCount}
              </span>
            )}
            {boardName && (
              <span className="flex items-center gap-0.5 max-w-[60%] truncate">
                <LayoutDashboard size={11} />
                <span className="truncate">{boardName}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-0.5">
          <AlertCircle size={11} className={getPriorityColor(task.priority)} />
          <span className={cn('text-[10px] font-medium uppercase tracking-wide', getPriorityColor(task.priority))}>
            {task.priority}
          </span>
        </div>

        {task.assignee && (
          <div className="flex items-center">
            {task.assignee.avatar ? (
              <Image
                src={task.assignee.avatar}
                alt={task.assignee.name}
                width={20}
                height={20}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-[10px] font-semibold">
                {task.assignee.name.charAt(0)}
              </div>
            )}
          </div>
        )}
      </div>

      {task.status === 'BLOCKED' && (
        <div className="absolute inset-x-2 bottom-2 px-1.5 py-0.5 bg-red-50 border border-red-200 rounded text-[10px] text-red-700 font-medium text-center">
          Blocked
        </div>
      )}

      {/* Subtasks */}
      {task.subtasks && task.subtasks.length > 0 && (
        <SubtaskList
          subtasks={task.subtasks}
          onSubtaskClick={(taskId) => onClick?.()}
        />
      )}
    </div>
  )
}
