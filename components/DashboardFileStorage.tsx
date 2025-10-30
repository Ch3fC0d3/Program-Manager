import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import Button from './ui/Button'
import Modal from './ui/Modal'
import Input from './ui/Input'
import Textarea from './ui/Textarea'
import toast from 'react-hot-toast'
import { FileText, Upload, Download, Trash2, Pin, Star, Filter, X } from 'lucide-react'
import { format } from 'date-fns'

interface DashboardFile {
  id: string
  name: string
  description: string | null
  filename: string
  originalName: string
  mimeType: string
  size: number
  url: string
  category: string | null
  isImportant: boolean
  isPinned: boolean
  uploadedBy: string
  user: {
    id: string
    name: string
    email: string
  }
  createdAt: string
  updatedAt: string
}

export default function DashboardFileStorage() {
  const queryClient = useQueryClient()
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [isDragging, setIsDragging] = useState(false)
  // Track nested dragenter/dragleave to avoid flicker when hovering children
  const [dragCounter, setDragCounter] = useState(0)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    isImportant: false,
    isPinned: false,
  })

  const { data: files, isLoading } = useQuery<DashboardFile[]>({
    queryKey: ['dashboard-files', categoryFilter],
    queryFn: async () => {
      const params = categoryFilter !== 'all' ? `?category=${categoryFilter}` : ''
      const { data } = await axios.get(`/api/dashboard-files${params}`)
      return data
    },
  })

  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { data: result } = await axios.post('/api/dashboard-files', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return result
    },
    onSuccess: () => {
      toast.success('File uploaded successfully')
      queryClient.invalidateQueries({ queryKey: ['dashboard-files'] })
      setShowUploadModal(false)
      resetForm()
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Failed to upload file'
      toast.error(message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: result } = await axios.patch(`/api/dashboard-files/${id}`, data)
      return result
    },
    onSuccess: () => {
      toast.success('File updated')
      queryClient.invalidateQueries({ queryKey: ['dashboard-files'] })
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Failed to update file'
      toast.error(message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/dashboard-files/${id}`)
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
      if (!formData.name) {
        setFormData({ ...formData, name: file.name })
      }
    }
  }

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error('Please select a file')
      return
    }

    if (!formData.name.trim()) {
      toast.error('Please enter a file name')
      return
    }

    const data = new FormData()
    data.append('file', selectedFile)
    data.append('name', formData.name)
    if (formData.description) data.append('description', formData.description)
    if (formData.category) data.append('category', formData.category)
    data.append('isImportant', String(formData.isImportant))
    data.append('isPinned', String(formData.isPinned))

    uploadMutation.mutate(data)
  }

  const togglePin = (file: DashboardFile) => {
    updateMutation.mutate({
      id: file.id,
      data: { isPinned: !file.isPinned },
    })
  }

  const toggleImportant = (file: DashboardFile) => {
    updateMutation.mutate({
      id: file.id,
      data: { isImportant: !file.isImportant },
    })
  }

  const deleteFile = (id: string) => {
    if (confirm('Are you sure you want to delete this file?')) {
      deleteMutation.mutate(id)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      isImportant: false,
      isPinned: false,
    })
    setSelectedFile(null)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
      setFormData(prev => ({
        ...prev,
        name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
      }))
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

      {/* Filters */}
      <div className="mb-4 flex items-center gap-2">
        <Filter size={16} className="text-gray-400" />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
        >
          <option value="all">All Categories</option>
          <option value="Policy">Policy</option>
          <option value="Template">Template</option>
          <option value="Report">Report</option>
          <option value="Contract">Contract</option>
          <option value="Other">Other</option>
        </select>
      </div>

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
                    <h3 className="font-medium text-gray-900 truncate">{file.name}</h3>
                    {file.isPinned && <Pin size={14} className="text-blue-600 fill-current" />}
                    {file.isImportant && <Star size={14} className="text-yellow-500 fill-current" />}
                  </div>
                  {file.description && (
                    <p className="text-sm text-gray-600 truncate">{file.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>{formatFileSize(file.size)}</span>
                    {file.category && (
                      <span className="px-2 py-0.5 bg-gray-100 rounded">{file.category}</span>
                    )}
                    <span>Uploaded by {file.user.name}</span>
                    <span>{format(new Date(file.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => togglePin(file)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  title={file.isPinned ? 'Unpin' : 'Pin'}
                >
                  <Pin size={18} className={file.isPinned ? 'fill-current text-blue-600' : ''} />
                </button>
                <button
                  onClick={() => toggleImportant(file)}
                  className="p-2 text-gray-400 hover:text-yellow-500 transition-colors"
                  title={file.isImportant ? 'Remove star' : 'Mark as important'}
                >
                  <Star size={18} className={file.isImportant ? 'fill-current text-yellow-500' : ''} />
                </button>
                <a
                  href={file.url}
                  download={file.originalName}
                  className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                  title="Download"
                >
                  <Download size={18} />
                </a>
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

          <Input
            label="File Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter file name"
            required
          />

          <Textarea
            label="Description (Optional)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Add a description"
            rows={3}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category (Optional)
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Select category</option>
              <option value="Policy">Policy</option>
              <option value="Template">Template</option>
              <option value="Report">Report</option>
              <option value="Contract">Contract</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isPinned}
                onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Pin to top</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isImportant}
                onChange={(e) => setFormData({ ...formData, isImportant: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Mark as important</span>
            </label>
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
