import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface SubtaskListProps {
  subtasks: any[]
  onSubtaskClick?: (taskId: string) => void
}

export default function SubtaskList({ subtasks, onSubtaskClick }: SubtaskListProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!subtasks || subtasks.length === 0) return null

  return (
    <div className="mt-2 border-t border-gray-200 pt-2">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsExpanded(!isExpanded)
        }}
        className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 font-medium"
      >
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {subtasks.length} subtask{subtasks.length !== 1 ? 's' : ''}
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-1 pl-4 border-l-2 border-gray-200">
          {subtasks.map((subtask: any) => (
            <div
              key={subtask.id}
              onClick={(e) => {
                e.stopPropagation()
                onSubtaskClick?.(subtask.id)
              }}
              className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer group"
            >
              <div
                className={cn(
                  'w-4 h-4 rounded border-2 flex-shrink-0',
                  subtask.status === 'DONE'
                    ? 'bg-green-500 border-green-500'
                    : 'border-gray-300 group-hover:border-gray-400'
                )}
              >
                {subtask.status === 'DONE' && (
                  <svg className="w-full h-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span
                className={cn(
                  'text-xs flex-1',
                  subtask.status === 'DONE' ? 'line-through text-gray-500' : 'text-gray-700'
                )}
              >
                {subtask.title}
              </span>
              {subtask.assignee && (
                <div className="flex-shrink-0">
                  {subtask.assignee.avatar ? (
                    <Image
                      src={subtask.assignee.avatar}
                      alt={subtask.assignee.name}
                      width={16}
                      height={16}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-[8px] font-semibold">
                      {subtask.assignee.name.charAt(0)}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
