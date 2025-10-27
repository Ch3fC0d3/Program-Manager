import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Upload, Receipt, Loader2, CheckCircle, DollarSign, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import Button from './ui/Button'

interface ReceiptDropZoneProps {
  onExpenseCreated?: (expense: any) => void
}

type ReceiptResult =
  | { status: 'created'; expense: any; extracted: any }
  | { status: 'needs-amount'; extracted: any }

export default function ReceiptDropZone({ onExpenseCreated }: ReceiptDropZoneProps) {
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<ReceiptResult | null>(null)
  const queryClient = useQueryClient()

  const processReceipt = useCallback(async (file: File) => {
    setProcessing(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const { data: processData } = await axios.post('/api/expenses/process-receipt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (!processData?.success) {
        throw new Error('Failed to process receipt')
      }

      const extracted = processData.data
      const receiptFile = processData.file

      const parsedAmount = typeof extracted?.amount === 'number'
        ? extracted.amount
        : Number.parseFloat(String(extracted?.amount ?? ''))

      if (!parsedAmount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
        setResult({ status: 'needs-amount', extracted })
        toast.error('Receipt total could not be detected. Please create the expense manually.')
        return
      }

      const { data: expense } = await axios.post('/api/expenses', {
        amount: parsedAmount,
        estimatedAmount: parsedAmount,
        currency: extracted.currency || 'USD',
        category: extracted.category || 'Uncategorized',
        description: `Receipt from ${extracted.vendorName || 'Unknown Vendor'}`,
        date: extracted.date || new Date().toISOString().split('T')[0],
        receiptData: extracted,
        aiVendorName: extracted.vendorName,
        aiConfidence: extracted.confidence,
        aiExtractedData: extracted,
        receiptFile
      })

      setResult({ status: 'created', expense, extracted })
      toast.success('Receipt processed and expense created!')
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['expense-analytics'] })
      onExpenseCreated?.(expense)
    } catch (error: any) {
      console.error('Error processing receipt:', error)
      toast.error(error.response?.data?.error || 'Failed to process receipt')
    } finally {
      setProcessing(false)
    }
  }, [onExpenseCreated, queryClient])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    const file = acceptedFiles[0]
    await processReceipt(file)
  }, [processReceipt])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt']
    },
    maxFiles: 1,
    disabled: processing
  })

  const handleReset = () => {
    setResult(null)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {!result ? (
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
            processing && 'pointer-events-none opacity-50',
            isDragActive 
              ? 'border-green-500 bg-green-50' 
              : 'border-gray-300 bg-gray-50 hover:border-green-400 hover:bg-green-50'
          )}
        >
          <input {...getInputProps()} />
          {processing ? (
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 text-green-500 animate-spin" />
              <span className="text-sm font-medium text-gray-700">
                Processing receipt with AI...
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <Receipt className={cn(
                'w-5 h-5',
                isDragActive ? 'text-green-500' : 'text-gray-400'
              )} />
              <div className="text-left">
                <p className="text-sm font-medium text-gray-700">
                  {isDragActive ? 'Drop receipt here' : 'Drop receipt or click to upload'}
                </p>
                <p className="text-xs text-gray-500">
                  AI will extract vendor, amount, date & category
                </p>
              </div>
            </div>
          )}
        </div>
      ) : result.status === 'created' ? (
        <div className="bg-white rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2 text-green-600 mb-4">
            <CheckCircle className="w-5 h-5" />
            <span className="font-semibold">Expense Created Successfully!</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Amount</label>
                <p className="text-2xl font-bold text-gray-900">
                  ${result.expense.amount.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Vendor</label>
              <p className="text-sm font-medium text-gray-900">
                {result.extracted.vendorName || 'Unknown Vendor'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Date</label>
                <p className="text-sm text-gray-900">
                  {new Date(result.expense.date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Category</label>
                <p className="text-sm text-gray-900">{result.expense.category}</p>
              </div>
            </div>

            {result.extracted.items && result.extracted.items.length > 0 && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Items</label>
                <ul className="text-sm text-gray-700 mt-1 space-y-1">
                  {result.extracted.items.map((item: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-gray-400">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.extracted.confidence && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">AI Confidence</label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={cn(
                        'h-2 rounded-full',
                        result.extracted.confidence >= 0.8 ? 'bg-green-500' :
                        result.extracted.confidence >= 0.6 ? 'bg-yellow-500' :
                        'bg-orange-500'
                      )}
                      style={{ width: `${result.extracted.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {Math.round(result.extracted.confidence * 100)}%
                  </span>
                </div>
              </div>
            )}

            {result.expense.attachments?.length > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs font-medium text-blue-700">
                  📎 Receipt file attached ({result.expense.attachments.length} file)
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleReset}
              className="flex-1"
            >
              Scan Another Receipt
            </Button>
            <Button
              onClick={() => window.location.reload()}
              className="flex-1"
            >
              <Receipt className="w-4 h-4 mr-2" />
              View All Expenses
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2 text-yellow-600 mb-4">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-semibold">Amount required before creating an expense</span>
          </div>
          <p className="text-sm text-gray-600">
            We extracted details from the receipt, but the total could not be detected. Please review the
            information below and create the expense manually using the Add Expense button.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Vendor</label>
              <p className="text-sm font-medium text-gray-900">
                {result.extracted.vendorName || 'Unknown Vendor'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Date</label>
                <p className="text-sm text-gray-900">
                  {result.extracted.date ? new Date(result.extracted.date).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Category</label>
                <p className="text-sm text-gray-900">{result.extracted.category || 'Uncategorized'}</p>
              </div>
            </div>

            {result.extracted.items && result.extracted.items.length > 0 && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Items</label>
                <ul className="text-sm text-gray-700 mt-1 space-y-1">
                  {result.extracted.items.map((item: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-gray-400">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.extracted.confidence && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">AI Confidence</label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={cn(
                        'h-2 rounded-full',
                        result.extracted.confidence >= 0.8 ? 'bg-green-500' :
                        result.extracted.confidence >= 0.6 ? 'bg-yellow-500' :
                        'bg-orange-500'
                      )}
                      style={{ width: `${result.extracted.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {Math.round(result.extracted.confidence * 100)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button
              variant="outline"
              onClick={handleReset}
            >
              Scan Another Receipt
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
