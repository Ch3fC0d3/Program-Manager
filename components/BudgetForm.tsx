import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import toast from 'react-hot-toast'
import { CalendarRange, TrendingUp } from 'lucide-react'

import Modal from './ui/Modal'
import Button from './ui/Button'
import Input from './ui/Input'
import Select from './ui/Select'

const PERIOD_OPTIONS = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'YEARLY', label: 'Yearly' },
  { value: 'CUSTOM', label: 'Custom' }
]

interface BudgetFormProps {
  onClose: () => void
  onSuccess: () => void
}

interface VendorOption {
  id: string
  title: string
}

interface BoardOption {
  id: string
  name: string
}

export default function BudgetForm({ onClose, onSuccess }: BudgetFormProps) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [period, setPeriod] = useState('MONTHLY')
  const [category, setCategory] = useState('')
  const [boardId, setBoardId] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')

  const { data: boards } = useQuery({
    queryKey: ['boards'],
    queryFn: async () => {
      const { data } = await axios.get('/api/boards')
      return data as BoardOption[]
    },
    staleTime: 1000 * 60 * 5
  })

  const { data: vendorBoard } = useQuery({
    queryKey: ['vendors-board'],
    queryFn: async () => {
      const { data } = await axios.get('/api/vendors/board')
      return data
    },
    staleTime: 1000 * 60 * 5
  })

  const vendorOptions: VendorOption[] = vendorBoard?.tasks?.map((task: any) => ({
    id: task.id,
    title: task.title
  })) ?? []

  const createBudgetMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await axios.post('/api/budgets', payload)
      return response.data
    },
    onSuccess: () => {
      toast.success('Budget created')
      onSuccess()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error ?? 'Failed to create budget')
    }
  })

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!name || !amount || Number(amount) <= 0) {
      toast.error('Enter a name and valid amount')
      return
    }

    if (!startDate) {
      toast.error('Select a start date')
      return
    }

    createBudgetMutation.mutate({
      name,
      amount: Number(amount),
      period,
      category: category || null,
      boardId: boardId || null,
      vendorId: vendorId || null,
      startDate,
      endDate: endDate || null
    })
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Create Budget"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="budget-form" disabled={createBudgetMutation.isPending}>
            {createBudgetMutation.isPending ? 'Saving…' : 'Save Budget'}
          </Button>
        </>
      }
    >
      <form id="budget-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Budget Name *"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g., Q1 Marketing"
          required
        />

        <Input
          label="Amount *"
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
        />

        <Select
          label="Period"
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          options={PERIOD_OPTIONS}
        />

        <Input
          label="Category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          placeholder="Optional category"
        />

        <Select
          label="Board"
          value={boardId}
          onChange={(event) => setBoardId(event.target.value)}
        >
          <option value="">All boards</option>
          {boards?.map((board) => (
            <option key={board.id} value={board.id}>
              {board.name}
            </option>
          ))}
        </Select>

        <Select
          label="Vendor"
          value={vendorId}
          onChange={(event) => setVendorId(event.target.value)}
        >
          <option value="">All vendors</option>
          {vendorOptions.map((vendor) => (
            <option key={vendor.id} value={vendor.id}>
              {vendor.title}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Start Date *"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            required
          />
          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-md p-3">
          <TrendingUp className="w-4 h-4" />
          <span>Budgets help you track spending across boards, vendors, and categories.</span>
        </div>

        <div className="flex items-center gap-3 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-md p-3">
          <CalendarRange className="w-4 h-4" />
          <span>Leave end date blank for ongoing budgets.</span>
        </div>
      </form>
    </Modal>
  )
}
