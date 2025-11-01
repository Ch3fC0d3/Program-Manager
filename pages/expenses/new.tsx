import { useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import Layout from '@/components/Layout'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { ArrowLeft, Upload, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

export default function NewExpensePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const queryClient = useQueryClient()
  const [uploadingFile, setUploadingFile] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    estimatedAmount: '',
    vendor: '',
    boardId: ''
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Fetch boards for dropdown
  const { data: boards } = useQuery({
    queryKey: ['boards'],
    queryFn: async () => {
      const { data } = await axios.get('/api/boards')
      return data
    },
    enabled: !!session
  })

  // Fetch budgets for dropdown
  const { data: budgets } = useQuery({
    queryKey: ['budgets'],
    queryFn: async () => {
      const { data } = await axios.get('/api/budgets')
      return data
    },
    enabled: !!session
  })

  const createExpenseMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await axios.post('/api/expenses', data)
      return response.data
    },
    onSuccess: (data) => {
      toast.success('Expense created')
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      
      // If file selected, upload it
      if (selectedFile) {
        uploadFile(data.id)
      } else {
        router.push(`/expenses/${data.id}`)
      }
    },
    onError: (error: any) => {
      console.error('Failed to create expense:', error)
      toast.error(error.response?.data?.error || 'Failed to create expense')
    }
  })

  const uploadFile = async (expenseId: string) => {
    if (!selectedFile) return

    setUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('expenseId', expenseId)

      await axios.post('/api/expenses/upload-attachment', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      toast.success('File uploaded')
      router.push(`/expenses/${expenseId}`)
    } catch (error) {
      console.error('Failed to upload file:', error)
      toast.error('Failed to upload file')
      router.push(`/expenses/${expenseId}`)
    } finally {
      setUploadingFile(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.description || !formData.amount || !formData.boardId) {
      toast.error('Please fill in required fields')
      return
    }

    createExpenseMutation.mutate({
      description: formData.description,
      amount: parseFloat(formData.amount),
      category: formData.category || null,
      date: formData.date,
      estimatedAmount: formData.estimatedAmount ? parseFloat(formData.estimatedAmount) : null,
      aiVendorName: formData.vendor || null,
      boardId: formData.boardId
    })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      setSelectedFile(file)
      toast.success(`File selected: ${file.name}`)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      toast.success(`File selected: ${file.name}`)
    }
  }

  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin')
    return null
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/financials')}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft size={16} className="mr-1" /> Back to Financials
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create New Expense</h1>
          <p className="text-gray-600 mt-1">Add a new expense to your budget</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
            <div className="space-y-4">
              <Input
                label="Description *"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Drilling services for Well Site A"
                required
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Amount *"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />

                <Input
                  label="Estimated Amount"
                  type="number"
                  step="0.01"
                  value={formData.estimatedAmount}
                  onChange={(e) => setFormData({ ...formData, estimatedAmount: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Water/Desal, Operations"
                />

                <Input
                  label="Vendor"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  placeholder="e.g., ABC Drilling Company"
                />
              </div>

              <Input
                label="Date *"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Board/Project *
                </label>
                <select
                  value={formData.boardId}
                  onChange={(e) => setFormData({ ...formData, boardId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a board...</option>
                  {boards?.map((board: any) => (
                    <option key={board.id} value={board.id}>
                      {board.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Upload Receipt (Optional)</h2>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer',
                isDragging 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              )}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                document.getElementById('file-input')?.click()
              }}
            >
              <Upload 
                size={32} 
                className={cn(
                  'mx-auto mb-3',
                  isDragging ? 'text-blue-600' : 'text-gray-400'
                )} 
              />
              {selectedFile ? (
                <div>
                  <p className="text-sm font-medium text-green-600 mb-1">
                    ✓ {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    Click to change file
                  </p>
                </div>
              ) : isDragging ? (
                <p className="text-sm font-medium text-blue-600">Drop file here</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    Drag and drop or click to upload
                  </p>
                  <p className="text-xs text-gray-500">
                    PDF, Images, Word, Excel (max 10MB)
                  </p>
                </>
              )}
            </div>
            <input
              id="file-input"
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/financials')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createExpenseMutation.isPending || uploadingFile}
            >
              <DollarSign size={16} className="mr-2" />
              {createExpenseMutation.isPending || uploadingFile ? 'Creating...' : 'Create Expense'}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  )
}
