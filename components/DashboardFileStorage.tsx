import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import Button from './ui/Button'
import Modal from './ui/Modal'
import toast from 'react-hot-toast'
import { FileText, Upload, Trash2, Link as LinkIcon } from 'lucide-react'
import { format } from 'date-fns'

interface DriveFile {
  id: string
  name: string
  mimeType: string
  size?: string
  modifiedTime?: string
  webViewLink?: string
}

export default function DashboardFileStorage() {
  const queryClient = useQueryClient()
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [needsConnection, setNeedsConnection] = useState(false)
  // Track nested dragenter/dragleave to avoid flicker when hovering children
  const [dragCounter, setDragCounter] = useState(0)
  

  const { data: files, isLoading } = useQuery<DriveFile[]>({
    queryKey: ['dashboard-files'],
    queryFn: async () => {
      try {
        const { data } = await axios.get('/api/files')
        return Array.isArray(data) ? data : []
      } catch (error: any) {
        if (error?.response?.data?.needsConnection) {
          setNeedsConnection(true)
        }
        console.error('Failed to fetch files:', error)
        return []
      }
    },
    retry: false,
  })

  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { data: result } = await axios.post('/api/files', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return result
    },
    onSuccess: () => {
      toast.success('File uploaded successfully')
      queryClient.invalidateQueries({ queryKey: ['dashboard-files'] })
      setShowUploadModal(false)
      setSelectedFile(null)
    },
    onError: (error: any) => {
      if (error?.response?.data?.needsConnection) {
        setNeedsConnection(true)
        toast.error('Please connect your Google Drive first')
        return
      }
      const message = error?.response?.data?.error || 'Failed to upload file'
      toast.error(message)
    },
  })

  // No update mutation needed for Drive-backed simple list

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/files/${id}`)
    },
    onSuccess: () => {
      toast.success('File deleted')
      queryClient.invalidateQueries({ queryKey: ['dashboard-files'] })
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Failed to delete file'
      toast.error(message)
    },
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error('Please select a file')
      return
    }

    const data = new FormData()
    data.append('file', selectedFile)
    uploadMutation.mutate(data)
  }

  const deleteFile = (id: string) => {
    if (confirm('Are you sure you want to delete this file?')) {
      deleteMutation.mutate(id)
    }
  }

  const connectDrive = async () => {
    try {
      const { data } = await axios.get('/api/auth/google/connect')
      window.location.href = data.authUrl
    } catch (err) {
      toast.error('Failed to initiate Google Drive connection')
    }
  }

  const resetForm = () => {
    setSelectedFile(null)
  }

  const formatFileSize = (bytes?: string | number) => {
    if (bytes == null) return '—'
    const n = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes
    if (isNaN(n)) return '—'
    if (n < 1024) return `${n} B`
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
    return `${(n / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️'
    if (mimeType.startsWith('video/')) return '🎥'
    if (mimeType.includes('pdf')) return '📄'
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊'
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️'
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦'
    return '📁'
  }

  // Global prevention so the browser doesn't navigate when a file is dropped anywhere
  useEffect(() => {
    const onWindowDragOver = (e: DragEvent) => {
      e.preventDefault()
    }
    const onWindowDrop = (e: DragEvent) => {
      e.preventDefault()
    }
    window.addEventListener('dragover', onWindowDragOver)
    window.addEventListener('drop', onWindowDrop)
    return () => {
      window.removeEventListener('dragover', onWindowDragOver)
      window.removeEventListener('drop', onWindowDrop)
    }
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter((c) => c + 1)
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter((c) => {
      const next = Math.max(0, c - 1)
      if (next === 0) setIsDragging(false)
      return next
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter(0)
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      const file = droppedFiles[0]
      setSelectedFile(file)
      setShowUploadModal(true)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Important Files</h2>
          <p className="text-sm text-gray-600 mt-1">Store and manage important documents</p>
        </div>
        <Button onClick={() => setShowUploadModal(true)}>
          <Upload size={18} className="mr-2" />
          Upload File
        </Button>
      </div>

      {/* Connection prompt */}
      {needsConnection && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <LinkIcon className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-blue-900">Connect Google Drive</h3>
              <p className="text-sm text-blue-700 mt-1">
                Connect your Google Drive to upload and manage files.
              </p>
              <Button
                onClick={connectDrive}
                className="mt-3"
                size="sm"
              >
                Connect Google Drive
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Files List */}
      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative transition-all ${
          isDragging ? 'ring-2 ring-blue-500 ring-offset-2 bg-blue-50' : ''
        }`}
      >
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-50 bg-opacity-90 z-10 rounded-lg border-2 border-dashed border-blue-400">
            <div className="text-center">
              <Upload className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <p className="text-lg font-semibold text-blue-900">Drop file here to upload</p>
              <p className="text-sm text-blue-700 mt-2">Release to open upload dialog</p>
            </div>
          </div>
        )}
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : !files || files.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No files uploaded yet</p>
            <p className="text-sm text-gray-500">Drag and drop files here or click Upload File</p>
          </div>
        ) : (
        <div className="space-y-3">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="text-3xl">{getFileIcon(file.mimeType)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <a
                      href={file.webViewLink || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-gray-900 truncate hover:underline"
                    >
                      {file.name}
                    </a>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>{formatFileSize(file.size)}</span>
                    {file.modifiedTime && (
                      <span>{format(new Date(file.modifiedTime), 'MMM d, yyyy')}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {file.webViewLink && (
                  <a
                    href={file.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                    title="Open in Drive"
                  >
                    Open
                  </a>
                )}
                <button
                  onClick={() => deleteFile(file.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete"
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => {
          if (!uploadMutation.isPending) {
            setShowUploadModal(false)
            resetForm()
          }
        }}
        title="Upload File"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select File
            </label>
            <input
              type="file"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
            {selectedFile && (
              <p className="text-sm text-gray-600 mt-2">
                Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowUploadModal(false)
                resetForm()
              }}
              disabled={uploadMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploadMutation.isPending || !selectedFile}>
              {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
