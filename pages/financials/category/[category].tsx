import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import axios from 'axios'
import Layout from '@/components/Layout'
import Button from '@/components/ui/Button'
import { ArrowLeft, Download, FileText, Image as ImageIcon, File } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Expense {
  id: string
  amount: number
  description: string
  date: string
  category: string
  receiptUrl?: string
  attachments: Array<{
    id: string
    filename: string
    url: string
    mimeType: string
    size: number
  }>
  board: {
    id: string
    name: string
  }
}

interface CategoryDetail {
  category: string
  budgeted: number
  actual: number
  variance: number
  percentUsed: number
  status: 'good' | 'warning' | 'over'
  expenses: Expense[]
  budgetLineItems: Array<{
    id: string
    name: string
    plannedAmount: number
    actualAmount: number
    budgetName: string
  }>
}

export default function CategoryDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { category, period, boardId } = router.query
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<CategoryDetail | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.replace('/dashboard')
    }
  }, [status, session, router])

  const fetchCategoryDetail = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (period) params.append('period', period as string)
      if (boardId) params.append('boardId', boardId as string)

      console.log('Fetching category:', category)
      const response = await axios.get(`/api/financials/category/${encodeURIComponent(category as string)}?${params}`)
      console.log('Category data received:', response.data)
      setData(response.data)
    } catch (error: any) {
      console.error('Error fetching category detail:', error)
      console.error('Error response:', error.response?.data)
    } finally {
      setLoading(false)
    }
  }, [category, period, boardId])

  useEffect(() => {
    if (category && status === 'authenticated' && session?.user?.role === 'ADMIN') {
      fetchCategoryDetail()
    }
  }, [category, period, boardId, status, session, fetchCategoryDetail])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon size={20} />
    if (mimeType.includes('pdf')) return <FileText size={20} />
    return <File size={20} />
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50'
      case 'warning': return 'text-yellow-600 bg-yellow-50'
      case 'over': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  if (loading || status === 'loading') {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  if (!data) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl font-semibold text-gray-900 mb-2">
              {category ? decodeURIComponent(category as string) : 'Category'}
            </p>
            <p className="text-gray-600">No budget data found for this category</p>
            <Button
              variant="outline"
              onClick={() => router.push('/financials')}
              className="mt-4"
            >
              <ArrowLeft size={18} className="mr-2" />
              Back to Financials
            </Button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <Head>
        <title>{data.category} - Budget Detail</title>
      </Head>

      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="outline"
              onClick={() => router.push('/financials')}
              className="mb-4"
            >
              <ArrowLeft size={18} className="mr-2" />
              Back to Financials
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">{data.category}</h1>
            <p className="mt-2 text-gray-600">Budget breakdown and expenses</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Budgeted</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(data.budgeted)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Actual Spent</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(data.actual)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Variance</p>
              <p className={`text-2xl font-bold mt-2 ${data.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(data.variance)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Budget Used</p>
              <div className="flex items-center gap-3 mt-2">
                <p className="text-2xl font-bold text-gray-900">{data.percentUsed}%</p>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(data.status)}`}>
                  {data.status}
                </span>
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    data.status === 'over' ? 'bg-red-600' :
                    data.status === 'warning' ? 'bg-yellow-500' : 'bg-green-600'
                  }`}
                  style={{ width: `${Math.min(data.percentUsed, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Budget Line Items */}
          {data.budgetLineItems.length > 0 && (
            <div className="bg-white rounded-lg shadow mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Budget Line Items</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Planned</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actual</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.budgetLineItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.budgetName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{formatCurrency(item.plannedAmount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{formatCurrency(item.actualAmount)}</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                          item.plannedAmount - item.actualAmount >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(item.plannedAmount - item.actualAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Expenses with Files */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Expenses ({data.expenses.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {data.expenses.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500">
                  No expenses found for this category
                </div>
              ) : (
                data.expenses.map((expense) => (
                  <div key={expense.id} className="px-6 py-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{expense.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {expense.board.name} • {new Date(expense.date).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="text-lg font-semibold text-gray-900">{formatCurrency(expense.amount)}</p>
                    </div>

                    {/* Attachments */}
                    {expense.attachments && expense.attachments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium text-gray-700 uppercase tracking-wider">Attachments</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {expense.attachments.map((file) => (
                            <a
                              key={file.id}
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                            >
                              <div className="text-gray-600 group-hover:text-blue-600">
                                {getFileIcon(file.mimeType)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                                  {file.filename}
                                </p>
                                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                              </div>
                              <Download size={16} className="text-gray-400 group-hover:text-blue-600" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Receipt URL (legacy) */}
                    {expense.receiptUrl && (
                      <div className="mt-3">
                        <a
                          href={expense.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                        >
                          <FileText size={16} />
                          View Receipt
                        </a>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
