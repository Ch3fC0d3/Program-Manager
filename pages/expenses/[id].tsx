import { useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import Layout from '@/components/Layout'
import Button from '@/components/ui/Button'
import { ArrowLeft, DollarSign, Calendar, Receipt, FileText, Paperclip, Package, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'

export default function ExpenseDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const { data: session, status } = useSession()
  const queryClient = useQueryClient()

  const { data: expense, isLoading } = useQuery({
    queryKey: ['expense', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/expenses/${id}`)
      return data
    },
    enabled: !!id && !!session
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

  if (status === 'loading' || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
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
  const totalLineItems = lineItems.reduce((sum: number, item: any) => sum + (item.amount || 0), 0)

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
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteExpenseMutation.isPending}
            >
              <Trash2 size={16} className="mr-2" />
              Delete Expense
            </Button>
          </div>
        </div>

        {/* Expense Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  ${expense.amount.toFixed(2)}
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
                      ${expense.estimatedAmount.toFixed(2)}
                      <span className={cn(
                        'ml-2 text-xs',
                        expense.amount > expense.estimatedAmount ? 'text-red-600' : 'text-green-600'
                      )}>
                        ({expense.amount > expense.estimatedAmount ? '+' : ''}
                        ${(expense.amount - expense.estimatedAmount).toFixed(2)} variance)
                      </span>
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Line Items */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Line Items</h2>
              {lineItems.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No line items</p>
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
                        {item.quantity && item.unitPrice && (
                          <p className="text-sm text-gray-600">
                            {item.quantity} × ${item.unitPrice.toFixed(2)}
                          </p>
                        )}
                      </div>
                      <p className="text-lg font-bold text-gray-900">
                        ${item.amount.toFixed(2)}
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
                  <img
                    src={expense.receiptUrl}
                    alt="Receipt"
                    className="w-full rounded-lg border border-gray-200"
                  />
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
                        ${allocation.amount.toFixed(2)} allocated
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
      </div>
    </Layout>
  )
}
