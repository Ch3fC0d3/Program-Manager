import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import Button from './ui/Button'
import Modal from './ui/Modal'
import Input from './ui/Input'
import toast from 'react-hot-toast'
import { Upload, Download, Trash2, FileText, X } from 'lucide-react'
import { format } from 'date-fns'

interface ContactFile {
  id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  url: string
  uploadedBy: string
  user: {
    id: string
    name: string
  }
  createdAt: string
}

interface ContactFileUploadProps {
  contactId: string
}

export default function ContactFileUpload({ contactId }: ContactFileUploadProps) {
  const queryClient = useQueryClient()
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [description, setDescription] = useState('')

  const { data: files, isLoading } = useQuery<ContactFile[]>({
    queryKey: ['contact-files', contactId],
    queryFn: async () => {
      const { data } = await axios.get(`/api/contacts/${contactId}/files`)
      return data
    },
  })

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await axios.post(`/api/contacts/${contactId}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data
    },
    onSuccess: () => {
      toast.success('File uploaded successfully')
      queryClient.invalidateQueries({ queryKey: ['contact-files', contactId] })
      setShowUploadModal(false)
      resetForm()
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Failed to upload file'
      toast.error(message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      await axios.delete(`/api/contacts/${contactId}/files/${fileId}`)
    },
    onSuccess: () => {
      toast.success('File deleted')
      queryClient.invalidateQueries({ queryKey: ['contact-files', contactId] })
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

    const formData = new FormData()
    formData.append('file', selectedFile)
    if (description) formData.append('description', description)

    uploadMutation.mutate(formData)
  }

  const deleteFile = (fileId: string) => {
    if (confirm('Are you sure you want to delete this file?')) {
      deleteMutation.mutate(fileId)
    }
  }

  const resetForm = () => {
    setSelectedFile(null)
    setDescription('')
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

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Attached Files</h3>
        <Button size="sm" onClick={() => setShowUploadModal(true)}>
          <Upload size={16} className="mr-2" />
          Upload
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : !files || files.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">No files attached</p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="text-2xl">{getFileIcon(file.mimeType)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate text-sm">
                    {file.originalName}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                    <span>{formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span>{format(new Date(file.createdAt), 'MMM d, yyyy')}</span>
                    <span>•</span>
                    <span>{file.user.name}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <a
                  href={file.url}
                  download={file.originalName}
                  className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                  title="Download"
                >
                  <Download size={16} />
                </a>
                <button
                  onClick={() => deleteFile(file.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete"
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
            label="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description"
          />

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
