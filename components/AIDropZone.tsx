import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Upload, Sparkles, Loader2, FileText, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import Button from './ui/Button'

interface AIDropZoneProps {
  onTaskCreated?: (task: any) => void
}

export default function AIDropZone({ onTaskCreated }: AIDropZoneProps) {
  const [textInput, setTextInput] = useState('')
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const queryClient = useQueryClient()

  const processWithAI = useMutation({
    mutationFn: async (data: {
      content: string
      fileName?: string
      fileType?: string
      attachment?: {
        id: string
        url: string
        originalName: string
        mimeType: string
        size: number
      }
    }) => {
      const { data: response } = await axios.post('/api/ai/classify', data)
      return response
    },
    onSuccess: (data) => {
      setResult(data)
      toast.success('Content classified successfully!')
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      onTaskCreated?.(data.task)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to process content')
    },
    onSettled: () => {
      setProcessing(false)
    }
  })

  const uploadFile = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    const { data } = await axios.post('/api/uploads/ai-source', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    return data
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    setProcessing(true)
    setResult(null)

    try {
      const [maybeText, attachment] = await Promise.all([
        file.type === 'application/pdf' ? Promise.resolve('') : file.text(),
        uploadFile(file)
      ])

      processWithAI.mutate({
        content: typeof maybeText === 'string' ? maybeText : '',
        fileName: file.name,
        fileType: file.type,
        attachment
      })
    } catch (error) {
      console.error('Error processing file:', error)
      toast.error('Failed to read file')
      setProcessing(false)
    }
  }, [processWithAI])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/json': ['.json'],
      'text/csv': ['.csv'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1
  })

  const handleTextSubmit = () => {
    if (!textInput.trim()) {
      toast.error('Please enter some text')
      return
    }

    setProcessing(true)
    setResult(null)
    processWithAI.mutate({ content: textInput })
  }

  const handleReset = () => {
    setTextInput('')
    setResult(null)
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-dashed border-blue-300 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">AI Content Classifier</h3>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        Drop a file or paste text, and AI will automatically classify it as a Task, Vendor, or Contact and populate all fields.
      </p>

      {!result ? (
        <>
          {/* Drop Zone */}
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors mb-4',
              isDragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50'
            )}
          >
            <input {...getInputProps()} />
            <Upload className={cn(
              'w-12 h-12 mx-auto mb-3',
              isDragActive ? 'text-blue-500' : 'text-gray-400'
            )} />
            <p className="text-sm font-medium text-gray-700 mb-1">
              {isDragActive ? 'Drop file here' : 'Drop file here or click to browse'}
            </p>
            <p className="text-xs text-gray-500">
              Supports: TXT, MD, JSON, CSV, PDF, Excel (.xlsx, .xls)
            </p>
          </div>

          {/* Text Input */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-gray-300" />
              <span className="text-xs text-gray-500 font-medium">OR PASTE TEXT</span>
              <div className="flex-1 h-px bg-gray-300" />
            </div>

            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Paste any text here... emails, notes, requirements, etc."
              className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              disabled={processing}
            />

            <Button
              onClick={handleTextSubmit}
              disabled={processing || !textInput.trim()}
              className="w-full"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing with AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Classify & Create Task
                </>
              )}
            </Button>
          </div>
        </>
      ) : (
        /* Result Display */
        <div className="bg-white rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2 text-green-600 mb-4">
            <CheckCircle className="w-5 h-5" />
            <span className="font-semibold">
              {result.type === 'task' && 'Task Created Successfully!'}
              {result.type === 'vendor' && 'Vendor Created Successfully!'}
              {result.type === 'contact' && 'Contact Created Successfully!'}
            </span>
          </div>

          <div className="space-y-3">
            {result.type === 'task' && (
              <>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Title</label>
                  <p className="text-sm font-medium text-gray-900">{result.task?.title}</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">AI Summary</label>
                  <p className="text-sm text-gray-700">{result.task?.aiSummary}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Board</label>
                    <p className="text-sm text-gray-900">{result.board?.name}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Priority</label>
                    <p className={cn(
                      'text-sm font-medium',
                      result.task?.priority === 'URGENT' && 'text-red-600',
                      result.task?.priority === 'HIGH' && 'text-orange-600',
                      result.task?.priority === 'MEDIUM' && 'text-yellow-600',
                      result.task?.priority === 'LOW' && 'text-green-600'
                    )}>
                      {result.task?.priority}
                    </p>
                  </div>
                </div>

                {result.task?.aiLabels && result.task.aiLabels.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Suggested Labels</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {result.task.aiLabels.map((label: string, index: number) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {(result.type === 'vendor' || result.type === 'contact') && (
              <>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Name</label>
                  <p className="text-sm font-medium text-gray-900">
                    {result.vendor?.firstName || result.contact?.firstName} {result.vendor?.lastName || result.contact?.lastName}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Email</label>
                    <p className="text-sm text-gray-900">{result.vendor?.email || result.contact?.email || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Phone</label>
                    <p className="text-sm text-gray-900">{result.vendor?.phone || result.contact?.phone || 'N/A'}</p>
                  </div>
                </div>

                {(result.vendor?.company || result.contact?.company) && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Company</label>
                    <p className="text-sm text-gray-900">{result.vendor?.company || result.contact?.company}</p>
                  </div>
                )}

                {(result.vendor?.notes || result.contact?.notes) && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Notes</label>
                    <p className="text-sm text-gray-700">{result.vendor?.notes || result.contact?.notes}</p>
                  </div>
                )}
              </>
            )}

            {result.confidence && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">AI Confidence</label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={cn(
                        'h-2 rounded-full',
                        result.confidence >= 0.8 ? 'bg-green-500' :
                        result.confidence >= 0.6 ? 'bg-yellow-500' :
                        'bg-orange-500'
                      )}
                      style={{ width: `${result.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {Math.round(result.confidence * 100)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleReset}
              className="flex-1"
            >
              Create Another
            </Button>
            <Button
              onClick={() => {
                if (result.type === 'task') {
                  window.location.href = `/tasks/${result.task?.id}`
                } else if (result.type === 'vendor') {
                  window.location.href = `/vendors`
                } else if (result.type === 'contact') {
                  window.location.href = `/contacts`
                }
              }}
              className="flex-1"
            >
              <FileText className="w-4 h-4 mr-2" />
              View {result.type === 'task' ? 'Task' : result.type === 'vendor' ? 'Vendor' : 'Contact'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
