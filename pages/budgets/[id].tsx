import { useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import Layout from '@/components/Layout'
import Button from '@/components/ui/Button'
import { ArrowLeft, DollarSign, Calendar, TrendingUp, Receipt, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default function BudgetDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const { data: session, status } = useSession()
  const [selectedView, setSelectedView] = useState<'expenses' | 'line-items'>('expenses')

  const { data: budget, isLoading } = useQuery({
    queryKey: ['budget', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/budgets/${id}`)
      return data
    },
    enabled: !!id && !!session
  })

  if (status === 'loading' || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  if (!budget) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-16 text-center">
          <p className="text-gray-500">Budget not found</p>
          <Button className="mt-4" onClick={() => router.push('/financials')}>
            Back to Financials
          </Button>
        </div>
      </Layout>
    )
  }

  // Calculate totals
  const expenses = budget.allocations?.map((a: any) => a.expense) || []
  const totalSpent = expenses.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0)
  const percentUsed = budget.amount > 0 ? (totalSpent / budget.amount) * 100 : 0
  const isOverBudget = totalSpent > budget.amount
  const remaining = budget.amount - totalSpent

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
          <h1 className="text-3xl font-bold text-gray-900">{budget.name}</h1>
          <p className="text-gray-600 mt-1">{budget.period}</p>
        </div>

        {/* Budget Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Budget</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ${budget.amount.toFixed(2)}
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
                <p className="text-sm text-gray-600">Total Spent</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ${totalSpent.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Receipt className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Remaining</p>
                <p className={cn(
                  'text-2xl font-bold mt-1',
                  isOverBudget ? 'text-red-600' : 'text-green-600'
                )}>
                  ${Math.abs(remaining).toFixed(2)}
                </p>
              </div>
              <div className={cn(
                'p-3 rounded-lg',
                isOverBudget ? 'bg-red-100' : 'bg-green-100'
              )}>
                <TrendingUp className={cn(
                  'w-6 h-6',
                  isOverBudget ? 'text-red-600' : 'text-green-600'
                )} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Used</p>
                <p className={cn(
                  'text-2xl font-bold mt-1',
                  isOverBudget ? 'text-red-600' : 'text-gray-900'
                )}>
                  {percentUsed.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Budget Progress</span>
            <span className={cn(
              'text-sm font-semibold',
              isOverBudget ? 'text-red-600' : 'text-green-600'
            )}>
              {isOverBudget ? 'Over Budget' : 'On Track'}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={cn(
                'h-3 rounded-full transition-all',
                isOverBudget ? 'bg-red-500' : 'bg-green-500'
              )}
              style={{ width: `${Math.min(percentUsed, 100)}%` }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setSelectedView('expenses')}
                className={cn(
                  'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
                  selectedView === 'expenses'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                )}
              >
                Expenses ({expenses.length})
              </button>
              <button
                onClick={() => setSelectedView('line-items')}
                className={cn(
                  'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
                  selectedView === 'line-items'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                )}
              >
                Line Items ({budget.lineItems?.length || 0})
              </button>
            </div>
          </div>

          <div className="p-6">
            {selectedView === 'expenses' && (
              <div className="space-y-4">
                {expenses.length === 0 ? (
                  <div className="text-center py-12">
                    <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No expenses linked to this budget</p>
                  </div>
                ) : (
                  expenses.map((expense: any) => (
                    <Link
                      key={expense.id}
                      href={`/expenses/${expense.id}`}
                      className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <Receipt className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {expense.aiVendorName || 'Unknown Vendor'}
                            </p>
                            <p className="text-sm text-gray-600">
                              {expense.description || expense.category || 'No description'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(expense.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">
                            ${expense.amount.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            )}

            {selectedView === 'line-items' && (
              <div className="space-y-4">
                {!budget.lineItems || budget.lineItems.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No line items defined</p>
                  </div>
                ) : (
                  budget.lineItems.map((item: any) => {
                    const itemSpent = item.allocations?.reduce((sum: number, a: any) => 
                      sum + (a.amount || 0), 0
                    ) || 0
                    const itemPercent = item.amount > 0 ? (itemSpent / item.amount) * 100 : 0

                    return (
                      <div key={item.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium text-gray-900">{item.description}</p>
                            <p className="text-sm text-gray-600">{item.category}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900">
                              ${itemSpent.toFixed(2)} / ${item.amount.toFixed(2)}
                            </p>
                            <p className={cn(
                              'text-sm font-medium',
                              itemSpent > item.amount ? 'text-red-600' : 'text-green-600'
                            )}>
                              {itemPercent.toFixed(1)}% used
                            </p>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={cn(
                              'h-2 rounded-full transition-all',
                              itemSpent > item.amount ? 'bg-red-500' : 'bg-green-500'
                            )}
                            style={{ width: `${Math.min(itemPercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
