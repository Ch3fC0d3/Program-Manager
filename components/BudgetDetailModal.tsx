import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import Modal from './ui/Modal'
import Button from './ui/Button'
import Input from './ui/Input'
import { X, Plus, Trash2, Edit2, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import type { Budget } from '@/types/expense'
import ConfirmDialog from './ui/ConfirmDialog'

interface BudgetDetailModalProps {
  budget: Budget
  onClose: () => void
}

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

export default function BudgetDetailModal({ budget, onClose }: BudgetDetailModalProps) {
  const queryClient = useQueryClient()
  const [isEditingBudget, setIsEditingBudget] = useState(false)
  const [editingLineItem, setEditingLineItem] = useState<string | null>(null)
  const [showAddLineItem, setShowAddLineItem] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Budget edit form
  const [budgetForm, setBudgetForm] = useState({
    name: budget.name || '',
    amount: budget.amount || 0,
    period: budget.period || 'QUARTER',
    category: budget.category || '',
    startDate: budget.startDate ? new Date(budget.startDate).toISOString().split('T')[0] : '',
    endDate: budget.endDate ? new Date(budget.endDate).toISOString().split('T')[0] : ''
  })

  // New line item form
  const [newLineItem, setNewLineItem] = useState({
    name: '',
    description: '',
    type: 'EXPENSE',
    category: '',
    plannedAmount: '',
    periodStart: new Date().toISOString().split('T')[0],
    periodEnd: ''
  })

  // Fetch budget line items
  const { data: lineItemsData, isLoading: loadingLineItems } = useQuery({
    queryKey: ['budget-line-items', budget.id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/budgets/${budget.id}/line-items`)
      return data
    }
  })

  const lineItems: LineItem[] = lineItemsData?.lineItems || []

  // Update budget mutation
  const updateBudgetMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await axios.put(`/api/budgets/${budget.id}`, data)
      return response.data
    },
    onSuccess: () => {
      toast.success('Budget updated successfully')
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      queryClient.invalidateQueries({ queryKey: ['budget-line-items', budget.id] })
      setIsEditingBudget(false)
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to update budget'
      toast.error(errorMessage)
    }
  })

  // Add line item mutation
  const addLineItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await axios.post(`/api/budgets/${budget.id}/line-items`, data)
      return response.data
    },
    onSuccess: () => {
      toast.success('Line item added')
      queryClient.invalidateQueries({ queryKey: ['budget-line-items', budget.id] })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      setShowAddLineItem(false)
      setNewLineItem({
        name: '',
        description: '',
        type: 'EXPENSE',
        category: '',
        plannedAmount: '',
        periodStart: new Date().toISOString().split('T')[0],
        periodEnd: ''
      })
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to add line item'
      toast.error(errorMessage)
    }
  })

  // Update line item mutation
  const updateLineItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await axios.put(`/api/budgets/line-items/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      toast.success('Line item updated')
      queryClient.invalidateQueries({ queryKey: ['budget-line-items', budget.id] })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      setEditingLineItem(null)
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to update line item'
      toast.error(errorMessage)
    }
  })

  // Delete line item mutation
  const deleteLineItemMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/budgets/line-items/${id}`)
    },
    onSuccess: () => {
      toast.success('Line item deleted')
      queryClient.invalidateQueries({ queryKey: ['budget-line-items', budget.id] })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to delete line item'
      toast.error(errorMessage)
    }
  })

  const handleSaveBudget = () => {
    // Validate budget form
    if (!budgetForm.name || budgetForm.name.trim().length === 0) {
      toast.error('Budget name is required')
      return
    }

    if (budgetForm.name.length > 100) {
      toast.error('Budget name must be less than 100 characters')
      return
    }

    const amount = parseFloat(budgetForm.amount.toString())
    if (isNaN(amount) || amount <= 0) {
      toast.error('Budget amount must be greater than zero')
      return
    }

    if (!budgetForm.startDate) {
      toast.error('Start date is required')
      return
    }

    updateBudgetMutation.mutate({
      ...budgetForm,
      amount
    })
  }

  const handleAddLineItem = () => {
    if (!newLineItem.name || !newLineItem.plannedAmount) {
      toast.error('Please fill in required fields')
      return
    }

    const amount = parseFloat(newLineItem.plannedAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Amount must be greater than zero')
      return
    }

    if (newLineItem.name.trim().length === 0) {
      toast.error('Name cannot be empty')
      return
    }

    if (newLineItem.name.length > 100) {
      toast.error('Name must be less than 100 characters')
      return
    }

    addLineItemMutation.mutate({
      ...newLineItem,
      plannedAmount: amount
    })
  }

  const handleUpdateLineItem = (lineItem: LineItem, updates: any) => {
    updateLineItemMutation.mutate({
      id: lineItem.id,
      data: updates
    })
  }

  const handleDeleteLineItem = (id: string) => {
    setDeleteConfirm(id)
  }

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteLineItemMutation.mutate(deleteConfirm)
      setDeleteConfirm(null)
    }
  }

  const totalPlanned = lineItems.reduce((sum, item) => sum + item.plannedAmount, 0)
  const totalActual = lineItems.reduce((sum, item) => sum + item.actualAmount, 0)
  const variance = totalPlanned - totalActual

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={budget.name}
      size="xl"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">{budget.name}</h2>
        {!isEditingBudget && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditingBudget(true)}
          >
            <Edit2 size={16} className="mr-2" />
            Edit Budget
          </Button>
        )}
      </div>
      <div className="space-y-6">
        {/* Budget Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
          {isEditingBudget ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Budget Name"
                  value={budgetForm.name}
                  onChange={(e) => setBudgetForm({ ...budgetForm, name: e.target.value })}
                />
                <Input
                  label="Total Amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={budgetForm.amount}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value)
                    if (!isNaN(value) && value >= 0) {
                      setBudgetForm({ ...budgetForm, amount: value })
                    } else if (e.target.value === '') {
                      setBudgetForm({ ...budgetForm, amount: 0 })
                    }
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                  <select
                    value={budgetForm.period}
                    onChange={(e) => setBudgetForm({ ...budgetForm, period: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="MONTH">Monthly</option>
                    <option value="QUARTER">Quarterly</option>
                    <option value="YEAR">Yearly</option>
                  </select>
                </div>
                <Input
                  label="Category"
                  value={budgetForm.category}
                  onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Start Date"
                  type="date"
                  value={budgetForm.startDate}
                  onChange={(e) => setBudgetForm({ ...budgetForm, startDate: e.target.value })}
                />
                <Input
                  label="End Date"
                  type="date"
                  value={budgetForm.endDate}
                  onChange={(e) => setBudgetForm({ ...budgetForm, endDate: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveBudget} disabled={updateBudgetMutation.isPending}>
                  <Save size={16} className="mr-2" />
                  {updateBudgetMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="outline" onClick={() => setIsEditingBudget(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
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
          )}
        </div>

        {/* Line Items Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Line Items</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddLineItem(!showAddLineItem)}
            >
              <Plus size={16} className="mr-2" />
              Add Line Item
            </Button>
          </div>

          {/* Add Line Item Form */}
          {showAddLineItem && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Name *"
                  value={newLineItem.name}
                  onChange={(e) => setNewLineItem({ ...newLineItem, name: e.target.value })}
                  placeholder="e.g., Office Supplies"
                />
                <Input
                  label="Planned Amount *"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={newLineItem.plannedAmount}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === '' || parseFloat(value) >= 0) {
                      setNewLineItem({ ...newLineItem, plannedAmount: value })
                    }
                  }}
                  placeholder="0.00"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Category"
                  value={newLineItem.category}
                  onChange={(e) => setNewLineItem({ ...newLineItem, category: e.target.value })}
                  placeholder="Optional"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={newLineItem.type}
                    onChange={(e) => setNewLineItem({ ...newLineItem, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="EXPENSE">Expense</option>
                    <option value="REVENUE">Revenue</option>
                  </select>
                </div>
              </div>
              <Input
                label="Description"
                value={newLineItem.description}
                onChange={(e) => setNewLineItem({ ...newLineItem, description: e.target.value })}
                placeholder="Optional description"
              />
              <div className="flex gap-2">
                <Button onClick={handleAddLineItem} disabled={addLineItemMutation.isPending}>
                  {addLineItemMutation.isPending ? 'Adding...' : 'Add Line Item'}
                </Button>
                <Button variant="outline" onClick={() => setShowAddLineItem(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Line Items List */}
          {loadingLineItems ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : lineItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No line items yet. Add one to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {lineItems.map((item) => (
                <LineItemRow
                  key={item.id}
                  item={item}
                  isEditing={editingLineItem === item.id}
                  onEdit={() => setEditingLineItem(item.id)}
                  onSave={(updates) => handleUpdateLineItem(item, updates)}
                  onCancel={() => setEditingLineItem(null)}
                  onDelete={() => handleDeleteLineItem(item.id)}
                  isSaving={updateLineItemMutation.isPending}
                />
              ))}
            </div>
          )}

          {/* Totals */}
          {lineItems.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Total Planned</p>
                  <p className="font-semibold text-gray-900">${totalPlanned.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Actual</p>
                  <p className="font-semibold text-gray-900">${totalActual.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Variance</p>
                  <p className={cn(
                    'font-semibold',
                    variance >= 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    ${Math.abs(variance).toFixed(2)} {variance >= 0 ? 'under' : 'over'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Line Item"
        message="Are you sure you want to delete this line item? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </Modal>
  )
}

// Line Item Row Component
interface LineItemRowProps {
  item: LineItem
  isEditing: boolean
  onEdit: () => void
  onSave: (updates: Partial<LineItem>) => void
  onCancel: () => void
  onDelete: () => void
  isSaving: boolean
}

function LineItemRow({ item, isEditing, onEdit, onSave, onCancel, onDelete, isSaving }: LineItemRowProps) {
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
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
