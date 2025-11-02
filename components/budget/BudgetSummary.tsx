import { Edit2 } from 'lucide-react'
import Button from '../ui/Button'
import { cn } from '@/lib/utils'
import type { Budget } from '@/types/expense'

interface BudgetSummaryProps {
  budget: Budget
  isEditing: boolean
  onEdit: () => void
}

export default function BudgetSummary({ budget, isEditing, onEdit }: BudgetSummaryProps) {
  if (isEditing) {
    return null // Edit form is handled separately
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
      <div className="grid grid-cols-3 gap-6">
        <div>
          <p className="text-sm text-gray-600 mb-1">Total Budget</p>
          <p className="text-2xl font-bold text-gray-900">
            ${budget.amount?.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-1">Spent</p>
          <p className="text-2xl font-bold text-gray-900">
            ${budget.spent?.toFixed(2) || '0.00'}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-1">Remaining</p>
          <p className={cn(
            'text-2xl font-bold',
            budget.isOverBudget ? 'text-red-600' : 'text-green-600'
          )}>
            ${((budget.amount || 0) - (budget.spent || 0)).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  )
}
