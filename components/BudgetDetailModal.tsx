import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import Modal from './ui/Modal'
import Button from './ui/Button'
import Input from './ui/Input'
import { Plus, Edit2, Archive, ArchiveRestore } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import type { Budget } from '@/types/expense'
import ConfirmDialog from './ui/ConfirmDialog'
import { LineItemSkeleton } from './ui/LoadingSkeleton'
import BudgetSummary from './budget/BudgetSummary'
import BudgetEditForm from './budget/BudgetEditForm'
import LineItemRow from './budget/LineItemRow'
import { BUDGET_CATEGORIES } from '@/lib/categories'

interface BudgetDetailModalProps {
  budget: Budget
  onClose: () => void
}

interface LineItem {
  id: string
  name: string
  notes: string | null
  type: string
  category: string | null
  plannedAmount: number
  actualAmount?: number  // Calculated from allocations
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
    notes: '',
    type: 'CATEGORY',
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

  // Memoize lineItems to prevent unnecessary re-renders
  const lineItems: LineItem[] = useMemo(
    () => lineItemsData?.lineItems || [],
    [lineItemsData?.lineItems]
  )

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
        notes: '',
        type: 'CATEGORY',
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

  // Archive budget mutation
  const archiveBudgetMutation = useMutation({
    mutationFn: async (isArchived: boolean) => {
      const response = await axios.patch(`/api/budgets/${budget.id}`, { isArchived })
      return response.data
    },
    onSuccess: (data) => {
      toast.success(data.isArchived ? 'Budget archived' : 'Budget restored')
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      onClose()
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to update budget'
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

  // Memoized calculations - only recalculate when lineItems changes
  const totalPlanned = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.plannedAmount, 0),
    [lineItems]
  )

  const totalActual = useMemo(
    () => lineItems.reduce((sum, item) => sum + (item.actualAmount || 0), 0),
    [lineItems]
  )

  const variance = useMemo(
    () => totalPlanned - totalActual,
    [totalPlanned, totalActual]
  )

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Close modal with Escape key
      if (e.key === 'Escape' && !deleteConfirm) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [onClose, deleteConfirm])

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={budget.name}
      size="xl"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          {budget.name}
          {budget.isArchived && (
            <span className="ml-2 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded">
              Archived
            </span>
          )}
        </h2>
        {!isEditingBudget && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => archiveBudgetMutation.mutate(!budget.isArchived)}
              disabled={archiveBudgetMutation.isPending}
            >
              {budget.isArchived ? (
                <>
                  <ArchiveRestore size={16} className="mr-2" />
                  Restore
                </>
              ) : (
                <>
                  <Archive size={16} className="mr-2" />
                  Archive
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditingBudget(true)}
            >
              <Edit2 size={16} className="mr-2" />
              Edit Budget
            </Button>
          </div>
        )}
      </div>
      <div className="space-y-6">
        {/* Budget Summary */}
        {isEditingBudget ? (
          <BudgetEditForm
            budget={budget}
            onSave={handleSaveBudget}
            onCancel={() => setIsEditingBudget(false)}
            isSaving={updateBudgetMutation.isPending}
          />
        ) : (
          <BudgetSummary
            budget={budget}
            isEditing={isEditingBudget}
            onEdit={() => setIsEditingBudget(true)}
          />
        )}

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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={newLineItem.category}
                    onChange={(e) => setNewLineItem({ ...newLineItem, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select category...</option>
                    {BUDGET_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
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
                label="Notes"
                value={newLineItem.notes}
                onChange={(e) => setNewLineItem({ ...newLineItem, notes: e.target.value })}
                placeholder="Optional notes"
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
            <LineItemSkeleton count={3} />
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
