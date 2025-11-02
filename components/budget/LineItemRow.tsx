import { useState } from 'react'
import { Edit2, Trash2 } from 'lucide-react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { cn } from '@/lib/utils'

interface LineItem {
  id: string
  name: string
  description: string | null
  type: string
  category: string | null
  plannedAmount: number
  actualAmount: number
  periodStart: string
  periodEnd: string | null
}

interface LineItemRowProps {
  item: LineItem
  isEditing: boolean
  onEdit: () => void
  onSave: (updates: Partial<LineItem>) => void
  onCancel: () => void
  onDelete: () => void
  isSaving: boolean
}

export default function LineItemRow({ 
  item, 
  isEditing, 
  onEdit, 
  onSave, 
  onCancel, 
  onDelete, 
  isSaving 
}: LineItemRowProps) {
  const [editForm, setEditForm] = useState({
    name: item.name,
    description: item.description || '',
    category: item.category || '',
    plannedAmount: item.plannedAmount,
    type: item.type
  })

  if (isEditing) {
    return (
      <div className="bg-blue-50 rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Name"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
          />
          <Input
            label="Planned Amount"
            type="number"
            min="0.01"
            step="0.01"
            value={editForm.plannedAmount}
            onChange={(e) => {
              const value = parseFloat(e.target.value)
              if (!isNaN(value) && value >= 0) {
                setEditForm({ ...editForm, plannedAmount: value })
              } else if (e.target.value === '') {
                setEditForm({ ...editForm, plannedAmount: 0 })
              }
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Category"
            value={editForm.category}
            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={editForm.type}
              onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="EXPENSE">Expense</option>
              <option value="REVENUE">Revenue</option>
            </select>
          </div>
        </div>
        <Input
          label="Description"
          value={editForm.description}
          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onSave(editForm)} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <div>
            <p className="font-medium text-gray-900">{item.name}</p>
            {item.description && (
              <p className="text-sm text-gray-600">{item.description}</p>
            )}
            {item.category && (
              <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                {item.category}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-right">
          <p className="text-sm text-gray-600">Planned</p>
          <p className="font-semibold text-gray-900">${item.plannedAmount.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Actual</p>
          <p className="font-semibold text-gray-900">${item.actualAmount.toFixed(2)}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            aria-label="Edit line item"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            aria-label="Delete line item"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
