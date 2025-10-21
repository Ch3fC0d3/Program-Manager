import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import Layout from '@/components/Layout'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import ExpenseForm from '@/components/ExpenseForm'
import BudgetForm from '@/components/BudgetForm'
import ExpenseAnalytics from '@/components/ExpenseAnalytics'
import { 
  DollarSign, 
  Plus, 
  Upload, 
  TrendingUp, 
  PieChart,
  Receipt,
  Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function ExpensesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [selectedTab, setSelectedTab] = useState<'expenses' | 'budgets' | 'analytics'>('expenses')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const { data: expensesData, isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data } = await axios.get('/api/expenses')
      return data
    },
    enabled: !!session
  })

  const { data: budgets, isLoading: budgetsLoading } = useQuery({
    queryKey: ['budgets'],
    queryFn: async () => {
      const { data } = await axios.get('/api/budgets?active=true')
      return data
    },
    enabled: !!session
  })

  const { data: analytics } = useQuery({
    queryKey: ['expense-analytics'],
    queryFn: async () => {
      const { data } = await axios.get('/api/expenses/analytics')
      return data
    },
    enabled: !!session
  })

  if (status === 'loading' || expensesLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  const expenses = expensesData?.expenses || []
  const summary = expensesData?.summary || { total: 0, count: 0, byCategory: {} }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cost Tracking</h1>
            <p className="text-gray-600 mt-1">Track expenses, manage budgets, and analyze spending</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setShowReceiptModal(true)}>
              <Upload size={18} className="mr-2" />
              Upload Receipt
            </Button>
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                <p className="text-sm text-gray-600">Expenses</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{summary.count}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Receipt className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Budgets</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {budgets?.length || 0}
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
                <p className="text-sm text-gray-600">Categories</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {Object.keys(summary.byCategory).length}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <PieChart className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <div className="flex">
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
            </div>
          </div>

          <div className="p-6">
            {selectedTab === 'expenses' && (
              <div className="space-y-4">
                {expenses.length === 0 ? (
                  <div className="text-center py-12">
                    <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No expenses yet</p>
                    <Button onClick={() => setShowExpenseModal(true)} className="mt-4">
                      Add Your First Expense
                    </Button>
                  </div>
                ) : (
                  expenses.map((expense: any) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <Receipt className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {expense.vendor?.title || expense.aiVendorName || 'Unknown Vendor'}
                            </p>
                            <p className="text-sm text-gray-600">{expense.description || expense.category}</p>
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
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {selectedTab === 'budgets' && (
              <div className="space-y-4">
                {!budgets || budgets.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No budgets set</p>
                    <Button onClick={() => setShowBudgetModal(true)} className="mt-4">
                      Create Your First Budget
                    </Button>
                  </div>
                ) : (
                  budgets.map((budget: any) => (
                    <div
                      key={budget.id}
                      className="p-4 border border-gray-200 rounded-lg"
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
            )}

            {selectedTab === 'analytics' && (
              <ExpenseAnalytics data={analytics} />
            )}
          </div>
        </div>

        {/* Modals */}
        {showExpenseModal && (
          <ExpenseForm
            onClose={() => setShowExpenseModal(false)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['expenses'] })
              queryClient.invalidateQueries({ queryKey: ['expense-analytics'] })
              setShowExpenseModal(false)
            }}
          />
        )}

        {showBudgetModal && (
          <BudgetForm
            onClose={() => setShowBudgetModal(false)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['budgets'] })
              setShowBudgetModal(false)
            }}
          />
        )}
      </div>
    </Layout>
  )
}
