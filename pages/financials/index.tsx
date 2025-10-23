import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import axios from 'axios'
import Layout from '@/components/Layout'

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
  categoryBreakdown: CategoryData[]
  topCategories: CategoryData[]
  recentExpenses: any[]
  budgets: any[]
}

export default function FinancialsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<FinancialDashboard | null>(null)
  const [period, setPeriod] = useState('quarter')
  const [selectedBoard, setSelectedBoard] = useState<string>('')
  const [boards, setBoards] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [showAlerts, setShowAlerts] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchBoards()
      fetchDashboard()
    }
  }, [status, period, selectedBoard])

  const fetchBoards = async () => {
    try {
      const response = await axios.get('/api/boards')
      setBoards(response.data)
    } catch (error) {
      console.error('Error fetching boards:', error)
    }
  }

  const fetchDashboard = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ period })
      if (selectedBoard) params.append('boardId', selectedBoard)
      
      const response = await axios.get(`/api/financials/dashboard?${params}`)
      setData(response.data)
    } catch (error) {
      console.error('Error fetching dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAlerts = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedBoard) params.append('boardId', selectedBoard)
      
      const response = await axios.get(`/api/financials/alerts?${params}`)
      setAlerts(response.data.alerts || [])
      setShowAlerts(true)
    } catch (error) {
      console.error('Error fetching alerts:', error)
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
    } catch (error) {
      console.error('Error exporting report:', error)
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

  if (status === 'loading' || loading) {
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
              <button
                onClick={fetchAlerts}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition"
              >
                🔔 View Alerts
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
              >
                📊 Export CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
              >
                📄 Export JSON
              </button>
            </div>
          </div>

          {/* Filters */}
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

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Total Budgeted</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(data.summary.totalBudgeted)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(data.summary.totalActual)}
              </p>
            </div>
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
                    <tr key={idx} className="hover:bg-gray-50">
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
          <div className="bg-white rounded-lg shadow">
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
        </div>
      </div>
    </Layout>
  )
}
