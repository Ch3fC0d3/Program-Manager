import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Upload, Loader2, Sparkles, Building2 } from 'lucide-react'

import Modal from './ui/Modal'
import Button from './ui/Button'
import Input from './ui/Input'
import Select from './ui/Select'
import { cn } from '@/lib/utils'

type ExpenseFormMode = 'manual' | 'receipt'

interface ExpenseFormProps {
  onClose: () => void
  onSuccess: () => void
  mode?: ExpenseFormMode
}

interface VendorOption {
  id: string
  title: string
}

interface BoardOption {
  id: string
  name: string
}

interface ReceiptExtraction {
  vendorName?: string | null
  amount?: number | null
  currency?: string | null
  date?: string | null
  category?: string | null
  items?: string[] | null
  taxAmount?: number | null
  confidence?: number | null
}

export default function ExpenseForm({ onClose, onSuccess, mode = 'manual' }: ExpenseFormProps) {
  const [amount, setAmount] = useState('')
  const [currency] = useState('USD')
  const [vendorId, setVendorId] = useState('')
  const [boardId, setBoardId] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptData, setReceiptData] = useState<ReceiptExtraction | null>(null)
  const [processingReceipt, setProcessingReceipt] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (mode === 'receipt') {
      const timer = setTimeout(() => {
        fileInputRef.current?.click()
      }, 150)

      return () => clearTimeout(timer)
    }
  }, [mode])

  const { data: vendorBoard } = useQuery({
    queryKey: ['vendors-board'],
    queryFn: async () => {
      const { data } = await axios.get('/api/vendors/board')
      return data
    },
    staleTime: 1000 * 60 * 5
  })

  const vendorOptions: VendorOption[] = useMemo(() => {
    return vendorBoard?.tasks?.map((task: any) => ({
      id: task.id,
      title: task.title
    })) ?? []
  }, [vendorBoard])

  const { data: boards } = useQuery({
    queryKey: ['boards'],
    queryFn: async () => {
      const { data } = await axios.get('/api/boards')
      return data
    },
    staleTime: 1000 * 60 * 5
  })

  const createExpenseMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await axios.post('/api/expenses', payload)
      return response.data
    },
    onSuccess: () => {
      toast.success('Expense recorded')
      onSuccess()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error ?? 'Failed to add expense')
    }
  })

  const categories = [
    'Office Supplies',
    'Travel',
    'Food & Dining',
    'Software & Subscriptions',
    'Marketing',
    'Equipment',
    'Utilities',
    'Professional Services',
    'Other'
  ]

  const handleReceiptUpload = async (file: File) => {
    setProcessingReceipt(true)
    setReceiptFile(file)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const { data } = await axios.post('/api/expenses/process-receipt', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      if (data?.success) {
        const extracted = data.data as ReceiptExtraction
        setReceiptData(extracted)

        if (extracted.amount) {
          setAmount(String(extracted.amount))
        }

        if (extracted.category) {
          setCategory(extracted.category)
        }

        if (extracted.date) {
          setDate(extracted.date)
        }

        if (extracted.vendorName) {
          setDescription(extracted.vendorName)

          const matchedVendor = vendorOptions.find(v =>
            v.title.toLowerCase() === extracted.vendorName?.toLowerCase()
          )

          if (matchedVendor) {
            setVendorId(matchedVendor.id)
          }
        }

        toast.success(`Receipt parsed (${Math.round((extracted.confidence ?? 0) * 100)}% confidence)`)
      }
    } catch (error: any) {
      console.error('Receipt upload failed', error)
      toast.error(error?.response?.data?.error ?? 'Failed to process receipt')
    } finally {
      setProcessingReceipt(false)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleReceiptUpload(file)
    }
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!amount || Number(amount) <= 0) {
      toast.error('Enter a valid amount')
      return
    }

    createExpenseMutation.mutate({
      amount: Number(amount),
      currency,
      vendorId: vendorId || null,
      boardId: boardId || null,
      category: category || null,
      description: description || null,
      date,
      receiptData: receiptData ?? null,
      aiVendorName: receiptData?.vendorName ?? null,
      aiConfidence: receiptData?.confidence ?? null,
      aiExtractedData: receiptData ?? null
    })
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={mode === 'receipt' ? 'Upload Receipt' : 'Add Expense'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="expense-form" disabled={createExpenseMutation.isPending}>
            {createExpenseMutation.isPending ? 'Saving…' : 'Save Expense'}
          </Button>
        </>
      }
    >
      <form id="expense-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Receipt (optional) {mode === 'receipt' && <span className="text-xs text-blue-600">AI assisted</span>}
          </label>
          <div className="flex items-center gap-3">
            <label
              className={cn(
                'flex items-center justify-center flex-1 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
                processingReceipt ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-blue-500'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.txt,.eml"
                className="hidden"
                onChange={handleFileChange}
                disabled={processingReceipt}
              />
              {processingReceipt ? (
                <span className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" /> Processing receipt…
                </span>
              ) : (
                <span className="flex items-center gap-2 text-sm text-gray-600">
                  <Upload className="w-4 h-4" />
                  {receiptFile ? receiptFile.name : 'Upload or drop receipt'}
                </span>
              )}
            </label>
            {receiptData?.confidence && (
              <span className="flex items-center gap-1 text-xs text-gray-500 px-2 py-1 border border-gray-200 rounded-md">
                <Sparkles className="w-4 h-4 text-blue-500" />
                {(receiptData.confidence * 100).toFixed(0)}%
              </span>
            )}
          </div>
          {receiptData && (
            <div className="mt-3 p-3 border border-blue-100 bg-blue-50 rounded-md text-sm text-blue-900 space-y-1">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span className="font-medium">AI Receipt Summary</span>
              </div>
              {receiptData.vendorName && <p>Vendor: {receiptData.vendorName}</p>}
              {typeof receiptData.amount === 'number' && (
                <p>Amount: ${receiptData.amount.toFixed(2)}</p>
              )}
              {receiptData.date && <p>Date: {receiptData.date}</p>}
              {receiptData.category && <p>Category: {receiptData.category}</p>}
              {Array.isArray(receiptData.items) && receiptData.items.length > 0 && (
                <p>Items: {receiptData.items.join(', ')}</p>
              )}
            </div>
          )}
        </div>

        <Input
          label="Amount *"
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
        />

        <Select
          label="Currency"
          value={currency}
          onChange={() => {}}
          disabled
          options={[{ value: 'USD', label: 'USD' }]}
        />

        <Select
          label="Vendor"
          value={vendorId}
          onChange={(event) => setVendorId(event.target.value)}
        >
          <option value="">Select vendor (optional)</option>
          {vendorOptions.map((vendor) => (
            <option key={vendor.id} value={vendor.id}>
              {vendor.title}
            </option>
          ))}
        </Select>

        <Select
          label="Board"
          value={boardId}
          onChange={(event) => setBoardId(event.target.value)}
        >
          <option value="">Link to board (optional)</option>
          {boards?.map((board: BoardOption) => (
            <option key={board.id} value={board.id}>
              {board.name}
            </option>
          ))}
        </Select>

        <Select
          label="Category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="">Select category (optional)</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </Select>

        <Input
          label="Description"
          placeholder="What was this expense for?"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />

        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </form>
    </Modal>
  )
}
