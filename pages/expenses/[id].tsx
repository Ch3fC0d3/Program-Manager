import { useState, useRef } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import Layout from '@/components/Layout'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { ArrowLeft, DollarSign, Calendar, Receipt, FileText, Paperclip, Package, Trash2, Edit2, Upload, X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'
import type { Expense, ExpenseLineItem, Attachment } from '@/types/expense'

export default function ExpenseDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const { data: session, status } = useSession()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    amount: '',
    description: '',
    category: '',
    date: '',
    estimatedAmount: ''
  })
  const [uploadingFile, setUploadingFile] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [editingLineItems, setEditingLineItems] = useState(false)
  const [lineItemsData, setLineItemsData] = useState<any[]>([])
  const [savingLineItems, setSavingLineItems] = useState(false)

  const { data: expense, isLoading, error } = useQuery({
    queryKey: ['expense', id],
    queryFn: async () => {
      try {
        const { data } = await axios.get(`/api/expenses/${id}`)
        return data
      } catch (err: any) {
        console.error('Error loading expense:', err)
        console.error('Expense ID:', id)
        console.error('Error response:', err.response?.data)
        throw err
      }
    },
    enabled: !!id && !!session,
    retry: false
  })

  const deleteExpenseMutation = useMutation({
    mutationFn: async () => {
      await axios.delete(`/api/expenses/${id}`)
    },
    onSuccess: () => {
      toast.success('Expense deleted')
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      router.push('/financials')
    },
    onError: () => {
      toast.error('Failed to delete expense')
    }
  })

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
      deleteExpenseMutation.mutate()
    }
  }

  const updateExpenseMutation = useMutation({
    mutationFn: async (data: any) => {
      await axios.patch(`/api/expenses/${id}`, data)
    },
    onSuccess: () => {
      toast.success('Expense updated')
      queryClient.invalidateQueries({ queryKey: ['expense', id] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      setIsEditing(false)
    },
    onError: () => {
      toast.error('Failed to update expense')
    }
  })

  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('expenseId', id as string)
      const { data } = await axios.post('/api/expenses/upload-attachment', formData)
      return data
    },
    onSuccess: () => {
      toast.success('File uploaded')
      queryClient.invalidateQueries({ queryKey: ['expense', id] })
    },
    onError: () => {
      toast.error('Failed to upload file')
    }
  })

  const handleEdit = () => {
    if (expense) {
      setEditData({
        amount: expense.amount.toString(),
        description: expense.description || '',
        category: expense.category || '',
        date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : '',
        estimatedAmount: expense.estimatedAmount?.toString() || ''
      })
      setIsEditing(true)
    }
  }

  const handleSaveEdit = () => {
    updateExpenseMutation.mutate({
      amount: parseFloat(editData.amount),
      description: editData.description,
      category: editData.category,
      date: editData.date,
      estimatedAmount: editData.estimatedAmount ? parseFloat(editData.estimatedAmount) : undefined
    })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingFile(true)
    try {
      await uploadFileMutation.mutateAsync(file)
    } finally {
      setUploadingFile(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (!file) return

    setUploadingFile(true)
    try {
      await uploadFileMutation.mutateAsync(file)
    } finally {
      setUploadingFile(false)
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-16 text-center">
          <p className="text-red-600 font-semibold mb-2">Error loading expense</p>
          <p className="text-gray-500 mb-4">
            {(error as any)?.response?.status === 404 
              ? 'Expense not found' 
              : 'Failed to load expense details'}
          </p>
          <p className="text-xs text-gray-400 mb-4">Expense ID: {id}</p>
          <Button className="mt-4" onClick={() => router.push('/financials')}>
            Back to Financials
          </Button>
        </div>
      </Layout>
    )
  }

  // Initialize line items data when expense loads
  const initializeLineItems = () => {
    if (expense?.lineItems) {
      setLineItemsData(expense.lineItems.map((item: any) => ({
        id: item.id,
        description: item.description || '',
        quantity: item.quantity || 1,
        unitCost: item.unitCost || 0,
        totalAmount: item.totalAmount || 0
      })))
    }
  }

  if (!expense) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-16 text-center">
          <p className="text-gray-500">Expense not found</p>
          <Button className="mt-4" onClick={() => router.push('/financials')}>
            Back to Financials
          </Button>
        </div>
      </Layout>
    )
  }

  const lineItems = expense.lineItems || []
  const totalLineItems = lineItems.reduce((sum: number, item: any) => sum + (item.totalAmount || item.amount || 0), 0)

  const handleAIAutoFill = () => {
    if (!expense.aiExtractedData) {
      toast.error('No AI data available')
      return
    }

    const aiData = expense.aiExtractedData as any
    const extractedLineItems = aiData.lineItems || []

    if (extractedLineItems.length === 0) {
      toast.error('No line items found in AI data')
      return
    }

    const formattedItems = extractedLineItems.map((item: any, index: number) => ({
      id: `new-${index}`,
      description: item.description || 'Line Item',
      quantity: item.quantity || 1,
      unitCost: item.rate || item.unitCost || 0,
      totalAmount: item.total || item.totalAmount || 0
    }))

    setLineItemsData(formattedItems)
    setEditingLineItems(true)
    toast.success(`Loaded ${formattedItems.length} line items from AI`)
  }

  const handleAddLineItem = () => {
    setLineItemsData([...lineItemsData, {
      id: `new-${Date.now()}`,
      description: '',
      quantity: 1,
      unitCost: 0,
      totalAmount: 0
    }])
  }

  const handleRemoveLineItem = (id: string) => {
    setLineItemsData(lineItemsData.filter(item => item.id !== id))
  }

  const handleLineItemChange = (id: string, field: string, value: any) => {
    setLineItemsData(lineItemsData.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value }
        // Auto-calculate total if quantity or unitCost changes
        if (field === 'quantity' || field === 'unitCost') {
          updated.totalAmount = (updated.quantity || 0) * (updated.unitCost || 0)
        }
        return updated
      }
      return item
    }))
  }

  const handleSaveLineItems = async () => {
    setSavingLineItems(true)
    try {
      await axios.patch(`/api/expenses/${id}/line-items`, {
        lineItems: lineItemsData
      })
      toast.success('Line items saved')
      queryClient.invalidateQueries({ queryKey: ['expense', id] })
      setEditingLineItems(false)
    } catch (error) {
      console.error('Failed to save line items:', error)
      toast.error('Failed to save line items')
    } finally {
      setSavingLineItems(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/financials')}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft size={16} className="mr-1" /> Back to Financials
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {expense.aiVendorName || expense.vendor?.title || 'Expense Details'}
              </h1>
              <p className="text-gray-600 mt-1">{expense.category}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleEdit}
              >
                <Edit2 size={16} className="mr-2" />
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteExpenseMutation.isPending}
              >
                <Trash2 size={16} className="mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Expense Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  ${expense.amount?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Date</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {new Date(expense.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Calendar className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Line Items</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {lineItems.length}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Package className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Expense Details</h2>
              <dl className="space-y-3">
                {expense.description && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Description</dt>
                    <dd className="mt-1 text-sm text-gray-900">{expense.description}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Category</dt>
                  <dd className="mt-1 text-sm text-gray-900">{expense.category || 'Uncategorized'}</dd>
                </div>
                {expense.task && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Linked Task</dt>
                    <dd className="mt-1">
                      <Link
                        href={`/tasks/${expense.task.id}`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {expense.task.title}
                      </Link>
                    </dd>
                  </div>
                )}
                {expense.board && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Board</dt>
                    <dd className="mt-1">
                      <Link
                        href={`/boards/${expense.board.id}`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {expense.board.name}
                      </Link>
                    </dd>
                  </div>
                )}
                {expense.estimatedAmount && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Estimated Amount</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      ${expense.estimatedAmount?.toFixed(2) || '0.00'}
                      <span className={cn(
                        'ml-2 text-xs',
                        (expense.amount || 0) > expense.estimatedAmount ? 'text-red-600' : 'text-green-600'
                      )}>
                        ({(expense.amount || 0) > expense.estimatedAmount ? '+' : ''}
                        ${((expense.amount || 0) - expense.estimatedAmount).toFixed(2)} variance)
                      </span>
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Line Items */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Line Items</h2>
                <div className="flex gap-2">
                  {expense.aiExtractedData && (expense.aiExtractedData as any).lineItems && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAIAutoFill}
                      disabled={editingLineItems}
                    >
                      <Package size={14} className="mr-1" /> AI Auto-Fill
                    </Button>
                  )}
                  {!editingLineItems ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        initializeLineItems()
                        setEditingLineItems(true)
                      }}
                    >
                      <Edit2 size={14} className="mr-1" /> Edit
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingLineItems(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveLineItems}
                        disabled={savingLineItems}
                      >
                        {savingLineItems ? 'Saving...' : 'Save'}
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {editingLineItems ? (
                <div className="space-y-3">
                  {lineItemsData.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-12 gap-3 p-3 border border-gray-200 rounded-lg">
                      <div className="col-span-5">
                        <Input
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => handleLineItemChange(item.id, 'description', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => handleLineItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Unit Cost"
                          value={item.unitCost}
                          onChange={(e) => handleLineItemChange(item.id, 'unitCost', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Total"
                          value={item.totalAmount}
                          onChange={(e) => handleLineItemChange(item.id, 'totalAmount', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-1 flex items-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveLineItem(item.id)}
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={handleAddLineItem}
                    className="w-full"
                  >
                    <Plus size={16} className="mr-2" /> Add Line Item
                  </Button>
                  <div className="flex items-center justify-between pt-3 border-t-2 border-gray-300">
                    <p className="font-semibold text-gray-900">Total</p>
                    <p className="text-xl font-bold text-gray-900">
                      ${lineItemsData.reduce((sum, item) => sum + (item.totalAmount || 0), 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              ) : lineItems.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No line items</p>
                  <p className="text-xs text-gray-500 mt-2">Click Edit to add line items or use AI Auto-Fill</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lineItems.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.description}</p>
                        {item.quantity && item.unitCost && (
                          <p className="text-sm text-gray-600">
                            {item.quantity} × ${item.unitCost?.toFixed(2) || '0.00'}
                          </p>
                        )}
                      </div>
                      <p className="text-lg font-bold text-gray-900">
                        ${(item.totalAmount || item.amount)?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  ))}
                  {lineItems.length > 1 && (
                    <div className="flex items-center justify-between pt-3 border-t-2 border-gray-300">
                      <p className="font-semibold text-gray-900">Total Line Items</p>
                      <p className="text-xl font-bold text-gray-900">
                        ${totalLineItems.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AI Extracted Data */}
            {expense.aiExtractedData && (
              <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
                <h2 className="text-lg font-semibold mb-4 text-blue-900">AI Extracted Data</h2>
                <pre className="text-xs text-blue-800 overflow-auto">
                  {JSON.stringify(expense.aiExtractedData, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Receipt */}
            {expense.receiptUrl && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4">Receipt</h3>
                {expense.receiptUrl.startsWith('data:image') ? (
                  <div className="relative w-full h-96">
                    <Image
                      src={expense.receiptUrl}
                      alt="Receipt"
                      fill
                      className="object-contain rounded-lg"
                      unoptimized
                    />
                  </div>
                ) : (
                  <a
                    href={expense.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                  >
                    <Paperclip size={16} />
                    View Receipt
                  </a>
                )}
              </div>
            )}

            {/* Budget Allocations */}
            {expense.allocations && expense.allocations.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4">Budget Allocations</h3>
                <div className="space-y-3">
                  {expense.allocations.map((allocation: any) => (
                    <div key={allocation.id} className="border-l-4 border-blue-500 pl-3">
                      {allocation.budget && (
                        <Link
                          href={`/budgets/${allocation.budget.id}`}
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          {allocation.budget.name}
                        </Link>
                      )}
                      <p className="text-sm text-gray-600">
                        ${allocation.amount?.toFixed(2) || '0.00'} allocated
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Files */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Upload Files</h3>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx"
              />
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
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload 
                  size={32} 
                  className={cn(
                    'mx-auto mb-3',
                    isDragging ? 'text-blue-600' : 'text-gray-400'
                  )} 
                />
                {uploadingFile ? (
                  <p className="text-sm font-medium text-blue-600">Uploading...</p>
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
            </div>

            {/* Created By */}
            {expense.createdBy && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4">Created By</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {expense.createdBy.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{expense.createdBy.name}</p>
                    <p className="text-sm text-gray-600">{expense.createdBy.email}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Edit Modal */}
        {isEditing && (
          <Modal
            isOpen
            onClose={() => setIsEditing(false)}
            title="Edit Expense"
            footer={
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveEdit}
                  disabled={updateExpenseMutation.isPending}
                >
                  {updateExpenseMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <Input
                label="Description"
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                required
              />
              <Input
                label="Amount"
                type="number"
                step="0.01"
                value={editData.amount}
                onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
                required
              />
              <Input
                label="Category"
                value={editData.category}
                onChange={(e) => setEditData({ ...editData, category: e.target.value })}
              />
              <Input
                label="Date"
                type="date"
                value={editData.date}
                onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                required
              />
              <Input
                label="Estimated Amount (Optional)"
                type="number"
                step="0.01"
                value={editData.estimatedAmount}
                onChange={(e) => setEditData({ ...editData, estimatedAmount: e.target.value })}
              />
            </div>
          </Modal>
        )}
      </div>
    </Layout>
  )
}
