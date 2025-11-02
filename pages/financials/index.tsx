import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Head from 'next/head'
import Link from 'next/link'
import axios from 'axios'
import Layout from '@/components/Layout'
import Button from '@/components/ui/Button'
import ExpenseForm from '@/components/ExpenseForm'
import BudgetForm from '@/components/BudgetForm'
import ExpenseAnalytics from '@/components/ExpenseAnalytics'
import ReceiptDropZone from '@/components/ReceiptDropZone'
import TimeTrackingTab from '@/components/TimeTrackingTab'
import ReportsTab from '@/components/ReportsTab'
import BudgetDetailModal from '@/components/BudgetDetailModal'
import { Plus, TrendingUp, Receipt, DollarSign, PieChart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDebounce } from '@/hooks/useDebounce'
import type { Expense, ExpenseSummary, Budget } from '@/types/expense'
import toast from 'react-hot-toast'

interface CategoryData {
  category: string
  budgeted: number
  actual: number
  variance: number
  percentUsed: number
  status: 'good' | 'warning' | 'over'
}

interface FinancialDashboard {
  period: {
    start: string
    end: string
    label: string
  }
  summary: {
    totalBudgeted: number
    totalActual: number
    totalVariance: number
    totalPercentUsed: number
    status: 'good' | 'warning' | 'over'
  }
  timeTracking?: {
    approvedMinutes: number
    approvedHours: number
    entryCount: number
    byUser?: Array<{
      user: { id: string; name: string | null; email: string | null }
      totalMinutes: number
      totalHours: number
      entryCount: number
      entries: any[]
    }>
    byTask?: Array<{
      task: { id: string; title: string; boardId: string }
      totalMinutes: number
      totalHours: number
      entryCount: number
      users: string[]
    }>
  }
  categoryBreakdown: CategoryData[]
  topCategories: CategoryData[]
  recentExpenses: any[]
  budgets: any[]
}

export default function FinancialsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const isAdmin = session?.user?.role === 'ADMIN'
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<FinancialDashboard | null>(null)
  const [period, setPeriod] = useState('quarter')
  const [selectedBoard, setSelectedBoard] = useState<string>('')
  const [boards, setBoards] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [showAlerts, setShowAlerts] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [selectedTab, setSelectedTab] = useState<'dashboard' | 'expenses' | 'budgets' | 'analytics' | 'time' | 'reports'>('dashboard')
  const queryClient = useQueryClient()

  const fetchBoards = useCallback(async () => {
    try {
      const response = await axios.get('/api/boards')
      setBoards(response.data)
    } catch (error: any) {
      console.error('Error fetching boards:', error)
      const errorMessage = error.response?.data?.message || 'Failed to load boards'
      toast.error(errorMessage)
    }
  }, [])

  const fetchDashboard = useCallback(async () => {
    if (!session?.user) return null

    if (!session?.user || session.user.role !== 'ADMIN') {
      setData(null)
      setLoading(false)
      return null
    }

    try {
      setLoading(true)
      const params = new URLSearchParams({ period })
      if (selectedBoard) params.append('boardId', selectedBoard)

      const response = await axios.get(`/api/financials/dashboard?${params}`)
      setData(response.data)
    } catch (error: any) {
      console.error('Error fetching dashboard:', error)
      const errorMessage = error.response?.data?.message || 'Failed to load financial data'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [session?.user, period, selectedBoard])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated' && isAdmin) {
      fetchBoards()
    }
  }, [status, fetchBoards, isAdmin])

  useEffect(() => {
    if (status === 'authenticated' && isAdmin) {
      fetchDashboard()
    }
  }, [status, fetchDashboard, isAdmin])

  useEffect(() => {
    if (status === 'authenticated' && !isAdmin) {
      router.replace('/dashboard')
    }
  }, [status, isAdmin, router])

  const fetchAlerts = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedBoard) params.append('boardId', selectedBoard)
      
      const response = await axios.get(`/api/financials/alerts?${params}`)
      setAlerts(response.data.alerts || [])
      setShowAlerts(true)
    } catch (error: any) {
      console.error('Error fetching alerts:', error)
      const errorMessage = error.response?.data?.message || 'Failed to load alerts'
      toast.error(errorMessage)
    }
  }

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const params = new URLSearchParams({ period, format })
      if (selectedBoard) params.append('boardId', selectedBoard)
      
      const response = await axios.get(`/api/financials/export?${params}`, {
        responseType: format === 'csv' ? 'blob' : 'json'
      })
      
      if (format === 'csv') {
        const blob = new Blob([response.data], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `financial-report-${period}-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      } else {
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `financial-report-${period}-${new Date().toISOString().split('T')[0]}.json`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error: any) {
      console.error('Error exporting report:', error)
      const errorMessage = error.response?.data?.message || 'Failed to export report'
      toast.error(errorMessage)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50'
      case 'warning': return 'text-yellow-600 bg-yellow-50'
      case 'over': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  if (status === 'loading' || (isAdmin && loading)) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading financial data...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (status === 'authenticated' && !isAdmin) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-semibold text-gray-900">Restricted Area</h1>
            <p className="text-gray-600">You need admin permissions to view financial data.</p>
            <Button onClick={() => router.push('/dashboard')}>Back to dashboard</Button>
          </div>
        </div>
      </Layout>
    )
  }

  if (!data) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-600">No financial data available</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <Head>
        <title>Financial Dashboard - Program Manager</title>
      </Head>

      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Financial Dashboard</h1>
              <p className="mt-2 text-gray-600">Budget vs Actual Analysis</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowBudgetModal(true)}>
                <TrendingUp size={18} className="mr-2" />
                New Budget
              </Button>
              <Button onClick={() => setShowExpenseModal(true)}>
                <Plus size={18} className="mr-2" />
                Add Expense
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="border-b border-gray-200">
              <div className="flex">
                <button
                  onClick={() => setSelectedTab('dashboard')}
                  className={cn(
                    'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
                    selectedTab === 'dashboard'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  )}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setSelectedTab('expenses')}
                  className={cn(
                    'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
                    selectedTab === 'expenses'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  )}
                >
                  Expenses
                </button>
                <button
                  onClick={() => setSelectedTab('budgets')}
                  className={cn(
                    'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
                    selectedTab === 'budgets'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  )}
                >
                  Budgets
                </button>
                <button
                  onClick={() => setSelectedTab('analytics')}
                  className={cn(
                    'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
                    selectedTab === 'analytics'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  )}
                >
                  Analytics
                </button>
                <button
                  onClick={() => setSelectedTab('time')}
                  className={cn(
                    'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
                    selectedTab === 'time'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  )}
                >
                  Time Tracking
                </button>
                <button
                  onClick={() => setSelectedTab('reports')}
                  className={cn(
                    'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
                    selectedTab === 'reports'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  )}
                >
                  Reports
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          {selectedTab === 'dashboard' && (
          <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Board</label>
              <select
                value={selectedBoard}
                onChange={(e) => setSelectedBoard(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">All Boards</option>
                {boards.map(board => (
                  <option key={board.id} value={board.id}>{board.name}</option>
                ))}
              </select>
            </div>
          </div>
          )}

          {/* Dashboard Tab */}
          {selectedTab === 'dashboard' && (
          <>
          {/* Receipt Drop Zone */}
          <div className="mb-6">
            <ReceiptDropZone
              onExpenseCreated={() => {
                queryClient.invalidateQueries({ queryKey: ['expenses'] })
                queryClient.invalidateQueries({ queryKey: ['expense-analytics'] })
                fetchDashboard()
              }}
            />
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <button
              type="button"
              onClick={() => setSelectedTab('budgets')}
              className="bg-white rounded-lg shadow p-6 text-left transition-transform hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
            >
              <p className="text-sm font-medium text-gray-600">Total Budgeted</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(data.summary.totalBudgeted)}
              </p>
              <p className="mt-3 text-xs text-blue-600 font-medium">View budgets →</p>
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab('expenses')}
              className="bg-white rounded-lg shadow p-6 text-left transition-transform hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
            >
              <p className="text-sm font-medium text-gray-600">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(data.summary.totalActual)}
              </p>
              <p className="mt-3 text-xs text-blue-600 font-medium">View expenses →</p>
            </button>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Remaining</p>
              <p className={`text-2xl font-bold mt-2 ${data.summary.totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(data.summary.totalVariance)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Budget Used</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {data.summary.totalPercentUsed}%
              </p>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    data.summary.status === 'over' ? 'bg-red-600' :
                    data.summary.status === 'warning' ? 'bg-yellow-500' : 'bg-green-600'
                  }`}
                  style={{ width: `${Math.min(data.summary.totalPercentUsed, 100)}%` }}
                ></div>
              </div>
            </div>
            {data.timeTracking && (
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm font-medium text-gray-600">Approved Hours</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {data.timeTracking.approvedHours.toFixed(1)} hrs
                </p>
                <p className="mt-3 text-xs text-gray-500">
                  Across {data.timeTracking.entryCount} approved entries
                </p>
              </div>
            )}
          </div>

          {/* Category Breakdown */}
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Budget vs Actual by Category</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Budgeted</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actual</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Variance</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">% Used</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.categoryBreakdown.map((cat, idx) => (
                    <tr 
                      key={idx} 
                      onClick={() => router.push(`/financials/category/${encodeURIComponent(cat.category)}?period=${period}${selectedBoard ? `&boardId=${selectedBoard}` : ''}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cat.category}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{formatCurrency(cat.budgeted)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{formatCurrency(cat.actual)}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${cat.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(cat.variance)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{cat.percentUsed}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(cat.status)}`}>
                          {cat.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Alerts Modal */}
          {showAlerts && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowAlerts(false)}>
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-auto m-4" onClick={(e) => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">Budget Alerts</h2>
                  <button onClick={() => setShowAlerts(false)} className="text-gray-400 hover:text-gray-600">
                    ✕
                  </button>
                </div>
                <div className="p-6">
                  {alerts.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">No budget alerts at this time. All budgets are within normal thresholds.</p>
                  ) : (
                    <div className="space-y-4">
                      {alerts.map((alert, idx) => (
                        <div key={idx} className={`p-4 rounded-lg border-l-4 ${
                          alert.severity === 'exceeded' ? 'bg-red-50 border-red-500' :
                          alert.severity === 'critical' ? 'bg-yellow-50 border-yellow-500' :
                          'bg-blue-50 border-blue-500'
                        }`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold text-gray-900">{alert.lineItemName || alert.budgetName}</h3>
                              <p className="text-sm text-gray-600 mt-1">{alert.boardName} • {alert.category}</p>
                              <p className="text-sm font-medium mt-2 ${
                                alert.severity === 'exceeded' ? 'text-red-700' :
                                alert.severity === 'critical' ? 'text-yellow-700' :
                                'text-blue-700'
                              }">{alert.message}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-gray-900">{alert.percentUsed}%</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatCurrency(alert.actualAmount)} / {formatCurrency(alert.plannedAmount)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Recent Expenses */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Expenses</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {data.recentExpenses.map((expense) => (
                <div key={expense.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{expense.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {expense.board?.name} • {new Date(expense.date).toLocaleDateString()}
                      </p>
                      {expense.category && (
                        <span className="inline-block mt-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                          {expense.category}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(expense.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </>
          )}

          {/* Expenses Tab */}
          {selectedTab === 'expenses' && <ExpensesTab />}

          {/* Budgets Tab */}
          {selectedTab === 'budgets' && <BudgetsTab />}

          {/* Analytics Tab */}
          {selectedTab === 'analytics' && <AnalyticsTab />}

          {/* Time Tracking Tab */}
          {selectedTab === 'time' && data?.timeTracking && <TimeTrackingTab data={data.timeTracking} />}

          {/* Reports Tab */}
          {selectedTab === 'reports' && <ReportsTab />}
        </div>
      </div>

      {/* Modals */}
      {showExpenseModal && (
        <ExpenseForm
          onClose={() => setShowExpenseModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] })
            queryClient.invalidateQueries({ queryKey: ['expense-analytics'] })
            fetchDashboard()
            setShowExpenseModal(false)
          }}
        />
      )}

      {showReceiptModal && (
        <ExpenseForm
          mode="receipt"
          onClose={() => setShowReceiptModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] })
            queryClient.invalidateQueries({ queryKey: ['expense-analytics'] })
            fetchDashboard()
            setShowReceiptModal(false)
          }}
        />
      )}

      {showBudgetModal && (
        <BudgetForm
          onClose={() => setShowBudgetModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['budgets'] })
            fetchDashboard()
            setShowBudgetModal(false)
          }}
        />
      )}
    </Layout>
  )
}

function ExpensesTab() {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')

  // Debounce search term to avoid excessive filtering
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const { data: expensesData, isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data } = await axios.get('/api/expenses')
      return data
    }
  })

  const expenses: Expense[] = expensesData?.expenses || []
  const summary: ExpenseSummary = expensesData?.summary || { total: 0, count: 0, estimatedTotal: 0, varianceTotal: 0 }

  // Filter expenses
  const filteredExpenses = expenses.filter((expense: Expense) => {
    // Search term filter (description, vendor, category)
    if (debouncedSearchTerm) {
      const search = debouncedSearchTerm.toLowerCase()
      const matchesSearch = 
        expense.description?.toLowerCase().includes(search) ||
        expense.aiVendorName?.toLowerCase().includes(search) ||
        expense.category?.toLowerCase().includes(search)
      if (!matchesSearch) return false
    }

    // Category filter
    if (categoryFilter && expense.category !== categoryFilter) {
      return false
    }

    // Date range filter
    if (dateFrom && new Date(expense.date) < new Date(dateFrom)) {
      return false
    }
    if (dateTo && new Date(expense.date) > new Date(dateTo)) {
      return false
    }

    // Amount range filter
    if (minAmount && expense.amount < parseFloat(minAmount)) {
      return false
    }
    if (maxAmount && expense.amount > parseFloat(maxAmount)) {
      return false
    }

    return true
  })

  // Get unique categories for filter dropdown
  const categories = Array.from(new Set(expenses.map((e: Expense) => e.category).filter(Boolean))) as string[]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ${summary.total.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Estimated</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ${summary.estimatedTotal.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Variance</p>
              <p className={`text-2xl font-bold mt-1 ${
                summary.varianceTotal >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                ${Math.abs(summary.varianceTotal).toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <PieChart className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expenses</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summary.count}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Receipt className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Expenses</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search description, vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {categories.map((cat: string) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <div className="flex gap-2">
            <input
              type="date"
              placeholder="From"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="date"
              placeholder="To"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min $"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="number"
              placeholder="Max $"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('')
              setCategoryFilter('')
              setDateFrom('')
              setDateTo('')
              setMinAmount('')
              setMaxAmount('')
            }}
          >
            Clear Filters
          </Button>
        </div>
        <p className="text-sm text-gray-600 mt-3">
          Showing {filteredExpenses.length} of {expenses.length} expenses
        </p>
      </div>

      {/* Expenses List */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">All Expenses</h3>
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No expenses yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredExpenses.map((expense: Expense) => (
              <Link
                key={expense.id}
                href={`/expenses/${expense.id}`}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Receipt className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {expense.aiVendorName || 'Unknown Vendor'}
                      </p>
                      <p className="text-sm text-gray-600">{expense.description || expense.category}</p>
                      {expense.estimatedAmount && (
                        <p className="text-xs text-gray-500 mt-1">
                          Est: ${expense.estimatedAmount.toFixed(2)} | Variance: ${
                            Math.abs(expense.amount - expense.estimatedAmount).toFixed(2)
                          }
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">
                    ${expense.amount.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {new Date(expense.date).toLocaleDateString()}
                  </p>
                  {expense.attachments?.length > 0 && (
                    <p className="text-xs text-blue-600 mt-1">
                      📎 {expense.attachments.length} file(s)
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function BudgetsTab() {
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null)
  const [showBudgetDetailModal, setShowBudgetDetailModal] = useState(false)
  
  const { data: budgets, isLoading } = useQuery({
    queryKey: ['budgets'],
    queryFn: async () => {
      const { data } = await axios.get('/api/budgets?active=true')
      return data
    }
  })

  const handleBudgetClick = (budget: Budget) => {
    setSelectedBudget(budget)
    setShowBudgetDetailModal(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {!budgets || budgets.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No budgets set</p>
          </div>
        ) : (
          budgets.map((budget: any) => (
            <div
              key={budget.id}
              onClick={() => handleBudgetClick(budget)}
              className="block bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-medium text-gray-900">{budget.name}</h3>
                  <p className="text-sm text-gray-600">{budget.period}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">
                    ${budget.spent?.toFixed(2)} / ${budget.amount.toFixed(2)}
                  </p>
                  <p className={cn(
                    'text-sm font-medium',
                    budget.isOverBudget ? 'text-red-600' : 'text-green-600'
                  )}>
                    {budget.percentUsed}% used
                  </p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={cn(
                    'h-2 rounded-full transition-all',
                    budget.isOverBudget ? 'bg-red-500' : 'bg-green-500'
                  )}
                  style={{ width: `${Math.min(budget.percentUsed, 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Budget Detail Modal */}
      {showBudgetDetailModal && selectedBudget && (
        <BudgetDetailModal
          budget={selectedBudget}
          onClose={() => {
            setShowBudgetDetailModal(false)
            setSelectedBudget(null)
          }}
        />
      )}
    </>
  )
}

function AnalyticsTab() {
  const { data: analytics } = useQuery({
    queryKey: ['expense-analytics'],
    queryFn: async () => {
      const { data } = await axios.get('/api/expenses/analytics')
      return data
    }
  })

  return <ExpenseAnalytics data={analytics} />
}
