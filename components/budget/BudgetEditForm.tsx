import { useState } from 'react'
import { Save } from 'lucide-react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import type { Budget } from '@/types/expense'

interface BudgetEditFormProps {
  budget: Budget
  onSave: (data: any) => void
  onCancel: () => void
  isSaving: boolean
}

export default function BudgetEditForm({ budget, onSave, onCancel, isSaving }: BudgetEditFormProps) {
  const [formData, setFormData] = useState({
    name: budget.name || '',
    amount: budget.amount || 0,
    period: budget.period || 'QUARTER',
    category: budget.category || '',
    startDate: budget.startDate ? new Date(budget.startDate).toISOString().split('T')[0] : '',
    endDate: budget.endDate ? new Date(budget.endDate).toISOString().split('T')[0] : ''
  })

  const handleSubmit = () => {
    onSave({
      ...formData,
      amount: parseFloat(formData.amount.toString())
    })
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Budget Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="Total Amount"
            type="number"
            min="0"
            step="0.01"
            value={formData.amount}
            onChange={(e) => {
              const value = parseFloat(e.target.value)
              if (!isNaN(value) && value >= 0) {
                setFormData({ ...formData, amount: value })
              } else if (e.target.value === '') {
                setFormData({ ...formData, amount: 0 })
              }
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
            <select
              value={formData.period}
              onChange={(e) => setFormData({ ...formData, period: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="MONTH">Monthly</option>
              <option value="QUARTER">Quarterly</option>
              <option value="YEAR">Yearly</option>
            </select>
          </div>
          <Input
            label="Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Date"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          />
          <Input
            label="End Date"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSubmit} disabled={isSaving}>
            <Save size={16} className="mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
