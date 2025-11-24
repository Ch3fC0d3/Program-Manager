import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Camera, Image as ImageIcon, Upload } from 'lucide-react'
import Button from './ui/Button'
import toast from 'react-hot-toast'

export default function PhotoUploadCard() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const data = new FormData()
      data.append('file', file)

      const { data: result } = await axios.post('/api/files', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      return result
    },
    onSuccess: () => {
      toast.success('Photo uploaded successfully')
      queryClient.invalidateQueries({ queryKey: ['dashboard-files'] })
      setPreviewUrl(null)
      setFileName('')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Failed to upload photo'
      toast.error(message)
    }
  })

  const handleFile = (file: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    setFileName(file.name)
    setPreviewUrl(URL.createObjectURL(file))
    uploadMutation.mutate(file)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    handleFile(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0] || null
    handleFile(file)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isDragging) setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Quick Photo Upload</h2>
          <p className="text-sm text-gray-600">
            Take a photo on your phone or drag & drop / browse an image from any device.
          </p>
        </div>
        <Button variant="outline" onClick={openFilePicker}>
          <Camera size={16} className="mr-2" />
          Take / Upload Photo
        </Button>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
        }`}
        onClick={openFilePicker}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleInputChange}
        />

        {previewUrl ? (
          <div className="flex flex-col items-center gap-2">
            <img
              src={previewUrl}
              alt="Preview"
              className="max-h-48 rounded-lg object-contain border border-gray-200 bg-white"
            />
            <p className="text-sm text-gray-700 truncate max-w-full">{fileName}</p>
            <p className="text-xs text-gray-500">
              Uploading new photos will replace this preview.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-1 border border-gray-200">
              <ImageIcon size={24} className="text-gray-500" />
            </div>
            <p className="text-sm font-medium text-gray-800">
              Tap to take a photo or choose from files
            </p>
            <p className="text-xs text-gray-500">
              Or drag and drop an image here
            </p>
          </div>
        )}
      </div>

      {uploadMutation.isPending && (
        <p className="mt-3 text-sm text-blue-600">Uploading photo...</p>
      )}
    </div>
  )
}
