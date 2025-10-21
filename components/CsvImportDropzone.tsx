import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, FileWarning } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CsvImportDropzoneProps {
  onUpload: (file: File) => Promise<void>
  disabled?: boolean
  title?: string
  description?: string
  acceptMimeTypes?: string[]
  acceptExtensions?: string[]
}

const defaultMimeTypes = ['text/csv', 'application/vnd.ms-excel']
const defaultExtensions = ['.csv']

export default function CsvImportDropzone({
  onUpload,
  disabled = false,
  title = 'Drag & drop CSV file',
  description = 'Drop your CSV here, or click to browse',
  acceptMimeTypes = defaultMimeTypes,
  acceptExtensions = defaultExtensions
}: CsvImportDropzoneProps) {
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return
      setError(null)
      const file = acceptedFiles[0]
      try {
        setIsUploading(true)
        await onUpload(file)
      } catch (err: any) {
        setError(err?.message || 'Failed to upload file')
      } finally {
        setIsUploading(false)
      }
    },
    [onUpload]
  )

  const handleReject = useCallback(() => {
    setError('Unsupported file. Please upload a CSV file.')
  }, [])

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject
  } = useDropzone({
    onDropAccepted: handleDrop,
    onDropRejected: handleReject,
    multiple: false,
    disabled: disabled || isUploading,
    accept: {
      ...acceptMimeTypes.reduce((acc, type) => ({ ...acc, [type]: acceptExtensions }), {})
    }
  })

  return (
    <div className="space-y-2">
      <div
        {...getRootProps({
          className: cn(
            'flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg px-6 py-10 transition-colors cursor-pointer text-center bg-white',
            isDragActive && 'border-blue-500 bg-blue-50',
            isDragReject && 'border-red-500 bg-red-50',
            (disabled || isUploading) && 'cursor-not-allowed opacity-70'
          )
        })}
      >
        <input {...getInputProps()} />
        <UploadCloud className="text-blue-500 mb-3" size={32} />
        <p className="text-lg font-semibold text-gray-900">{title}</p>
        <p className="text-sm text-gray-500 max-w-md">
          {isUploading ? 'Uploading…' : description}
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Accepted: {acceptExtensions.join(', ')}
        </p>
      </div>
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <FileWarning size={16} />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
