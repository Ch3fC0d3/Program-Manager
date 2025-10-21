import { useMemo } from 'react'
import { BarChart2, Calendar, PieChart, Store, TrendingUp, Wallet } from 'lucide-react'

interface ExpenseAnalyticsProps {
  data?: AnalyticsResponse | null
}

interface AnalyticsResponse {
  summary: {
    totalSpent: number
    avgExpense: number
    expenseCount: number
    daysAnalyzed: number
  }
  byCategory: Record<string, { total: number; count: number }>
  topVendors: Array<{
    name: string
    total: number
    count: number
    vendorId?: string | null
  }>
  spendingByDay: Record<string, number>
  budgetStatus: Array<{
    id: string
    name: string
    amount: number
    spent: number
    remaining: number
    percentUsed: number
    isOverBudget: boolean
  }>
  recentExpenses: Array<{
    id: string
    amount: number
    date: string
    category: string | null
    description: string | null
    vendorId: string | null
    boardId: string | null
    aiVendorName: string | null
    vendor?: { id: string; title: string } | null
    board?: { id: string; name: string } | null
  }>
}

const formatCurrency = (value: number) => {
  if (!Number.isFinite(value)) return '$0.00'
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

const getVendorName = (expense: AnalyticsResponse['recentExpenses'][number]) => {
  return expense.vendor?.title || expense.aiVendorName || 'Unknown Vendor'
}

export default function ExpenseAnalytics({ data }: ExpenseAnalyticsProps) {
  const summaryCards = useMemo(() => {
    if (!data) {
      return []
    }
    return [
      {
        label: 'Total Spent',
        value: formatCurrency(data.summary.totalSpent),
        icon: Wallet,
        tone: 'text-blue-600 bg-blue-100'
      },
      {
        label: 'Average Expense',
        value: formatCurrency(data.summary.avgExpense),
        icon: TrendingUp,
        tone: 'text-emerald-600 bg-emerald-100'
      },
      {
        label: 'Transactions',
        value: data.summary.expenseCount.toString(),
        icon: BarChart2,
        tone: 'text-purple-600 bg-purple-100'
      },
      {
        label: 'Days Analyzed',
        value: data.summary.daysAnalyzed.toString(),
        icon: Calendar,
        tone: 'text-orange-600 bg-orange-100'
      }
    ]
  }, [data])

  const categoryBreakdown = useMemo(() => {
    if (!data) {
      return []
    }
    const entries = Object.entries(data.byCategory)
    const total = entries.reduce((sum, [, value]) => sum + value.total, 0)
    return entries
      .map(([name, value]) => ({
        name,
        total: value.total,
        count: value.count,
        percent: total > 0 ? Math.round((value.total / total) * 1000) / 10 : 0
      }))
      .sort((a, b) => b.total - a.total)
  }, [data])

  const dailySpending = useMemo(() => {
    if (!data) {
      return []
    }
    return Object.entries(data.spendingByDay)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .slice(-14)
  }, [data])

  if (!data) {
    return (
      <div className="border border-gray-200 rounded-lg p-6 text-center text-gray-500">
        No analytics available yet. Add expenses to see insights.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{card.label}</p>
                <p className="text-2xl font-semibold text-gray-900 mt-2">{card.value}</p>
              </div>
              <div className={`p-3 rounded-full ${card.tone}`}>
                <card.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Top Vendors</h3>
            <Store className="w-5 h-5 text-gray-400" />
          </div>
          {data.topVendors.length === 0 ? (
            <p className="text-sm text-gray-500">No vendor data yet.</p>
          ) : (
            <div className="space-y-4">
              {data.topVendors.map((vendor) => (
                <div key={vendor.name} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{vendor.name}</p>
                    <p className="text-sm text-gray-500">{vendor.count} expenses</p>
                  </div>
                  <p className="font-semibold text-gray-900">{formatCurrency(vendor.total)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Spending by Category</h3>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>
          {categoryBreakdown.length === 0 ? (
            <p className="text-sm text-gray-500">No category data yet.</p>
          ) : (
            <div className="space-y-4">
              {categoryBreakdown.map((category) => (
                <div key={category.name}>
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900">{category.name}</p>
                    <p className="text-sm text-gray-500">{category.percent}%</p>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
                    <div
                      className="h-2 bg-blue-500 rounded-full"
                      style={{ width: `${Math.min(category.percent, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {category.count} expenses · {formatCurrency(category.total)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Budget Status</h3>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          {data.budgetStatus.length === 0 ? (
            <p className="text-sm text-gray-500">No active budgets.</p>
          ) : (
            <div className="space-y-4">
              {data.budgetStatus.map((budget) => (
                <div key={budget.id} className="border border-gray-200 rounded-md p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{budget.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(budget.spent)} spent · {formatCurrency(budget.amount)} budget
                      </p>
                    </div>
                    <span
                      className={`text-sm font-semibold ${budget.isOverBudget ? 'text-red-600' : 'text-emerald-600'}`}
                    >
                      {budget.percentUsed}% used
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full">
                    <div
                      className={`h-2 rounded-full ${budget.isOverBudget ? 'bg-red-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(budget.percentUsed, 110)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Remaining {formatCurrency(budget.remaining)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Daily Spending (Last 14 days)</h3>
            <BarChart2 className="w-5 h-5 text-gray-400" />
          </div>
          {dailySpending.length === 0 ? (
            <p className="text-sm text-gray-500">No spending data yet.</p>
          ) : (
            <div className="space-y-3">
              {dailySpending.map((item) => (
                <div key={item.date} className="grid grid-cols-6 items-center gap-3 text-sm">
                  <span className="col-span-2 text-gray-500">{item.date}</span>
                  <div className="col-span-3 h-2 bg-gray-200 rounded-full">
                    <div
                      className="h-2 bg-indigo-500 rounded-full"
                      style={{
                        width: `${Math.min((item.amount / (data.summary.totalSpent || 1)) * 200, 100)}%`
                      }}
                    />
                  </div>
                  <span className="col-span-1 text-right font-medium text-gray-900">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Expenses</h3>
          <Store className="w-5 h-5 text-gray-400" />
        </div>
        {data.recentExpenses.length === 0 ? (
          <p className="text-sm text-gray-500">No recent expenses recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase text-gray-500">
                  <th className="py-2">Vendor</th>
                  <th className="py-2">Category</th>
                  <th className="py-2">Board</th>
                  <th className="py-2 text-right">Amount</th>
                  <th className="py-2 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.recentExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="py-2 text-gray-900">{getVendorName(expense)}</td>
                    <td className="py-2 text-gray-500">{expense.category || 'Uncategorized'}</td>
                    <td className="py-2 text-gray-500">{expense.board?.name || '—'}</td>
                    <td className="py-2 text-right font-medium text-gray-900">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="py-2 text-right text-gray-500">
                      {new Date(expense.date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
