import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { Copy, AlertTriangle, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import Button from './ui/Button'
import Link from 'next/link'

interface DuplicateDetectorProps {
  taskId: string
  onClose?: () => void
}

export default function DuplicateDetector({ taskId, onClose }: DuplicateDetectorProps) {
  const [duplicates, setDuplicates] = useState<any[]>([])
  const [checked, setChecked] = useState(false)

  const checkDuplicates = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post('/api/ai/find-duplicates', { taskId })
      return data
    },
    onSuccess: (data) => {
      setDuplicates(data.duplicates || [])
      setChecked(true)
    }
  })

  if (!checked) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-yellow-900 mb-1">Check for Duplicates</h4>
            <p className="text-sm text-yellow-700 mb-3">
              AI can scan for similar tasks to avoid duplicate work.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => checkDuplicates.mutate()}
              disabled={checkDuplicates.isPending}
            >
              {checkDuplicates.isPending ? 'Checking...' : 'Check for Duplicates'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (duplicates.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Copy className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-green-900 mb-1">No Duplicates Found</h4>
            <p className="text-sm text-green-700">
              This task appears to be unique. No similar tasks detected.
            </p>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-green-600 hover:text-green-700">
              ×
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
      <div className="flex items-start gap-3 mb-3">
        <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-orange-900 mb-1">
            Potential Duplicates Found ({duplicates.length})
          </h4>
          <p className="text-sm text-orange-700">
            These tasks appear similar. Consider merging or linking them.
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-orange-600 hover:text-orange-700">
            ×
          </button>
        )}
      </div>

      <div className="space-y-2 mt-3">
        {duplicates.map((duplicate: any) => (
          <Link
            key={duplicate.id}
            href={`/tasks/${duplicate.id}`}
            className="block bg-white rounded-lg p-3 border border-orange-200 hover:border-orange-300 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {duplicate.title}
                  </span>
                  <span className={cn(
                    'px-2 py-0.5 text-xs rounded-full flex-shrink-0',
                    duplicate.similarity >= 80 ? 'bg-red-100 text-red-700' :
                    duplicate.similarity >= 60 ? 'bg-orange-100 text-orange-700' :
                    'bg-yellow-100 text-yellow-700'
                  )}>
                    {duplicate.similarity}% match
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="truncate">{duplicate.board?.name}</span>
                  {duplicate.assignee && (
                    <>
                      <span>•</span>
                      <span className="truncate">{duplicate.assignee.name}</span>
                    </>
                  )}
                  <span>•</span>
                  <span className="capitalize">{duplicate.status.replace('_', ' ').toLowerCase()}</span>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
