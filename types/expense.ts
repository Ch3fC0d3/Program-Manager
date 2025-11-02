/**
 * Expense-related TypeScript interfaces
 */

export interface Expense {
  id: string
  description: string
  amount: number
  estimatedAmount: number | null
  category: string | null
  date: Date | string
  aiVendorName: string | null
  boardId: string
  createdById: string
  createdAt: Date | string
  updatedAt: Date | string
  aiExtractedData: any | null
  board?: Board
  lineItems?: ExpenseLineItem[]
  attachments?: Attachment[]
  allocations?: BudgetAllocation[]
  createdBy?: User
}

export interface ExpenseLineItem {
  id: string
  expenseId: string
  description: string
  quantity: number | null
  unitCost: number | null
  totalAmount: number | null
  category: string | null
  createdAt: Date | string
  updatedAt: Date | string
}

export interface Attachment {
  id: string
  filename: string
  url: string
  mimeType: string
  size: number
  expenseId: string | null
  createdAt: Date | string
}

export interface BudgetAllocation {
  id: string
  budgetId: string
  expenseId: string
  amount: number
  createdAt: Date | string
  budget?: Budget
  expense?: Expense
}

export interface Budget {
  id: string
  name: string
  amount: number
  spent?: number
  percentUsed?: number
  isOverBudget?: boolean
  period: 'MONTH' | 'QUARTER' | 'YEAR' | string
  category: string | null
  startDate: Date | string
  endDate: Date | string | null
  boardId: string
  createdAt: Date | string
  updatedAt: Date | string
  board?: Board
  lineItems?: BudgetLineItem[]
  allocations?: BudgetAllocation[]
}

export interface BudgetLineItem {
  id: string
  budgetId: string
  name: string
  description: string | null
  type: string
  category: string | null
  periodStart: Date | string
  periodEnd: Date | string | null
  plannedAmount: number
  actualAmount: number
  createdAt: Date | string
  updatedAt: Date | string
  budget?: Budget
  allocations?: BudgetAllocation[]
}

export interface Board {
  id: string
  name: string
  description: string | null
  createdAt: Date | string
  updatedAt: Date | string
}

export interface User {
  id: string
  name: string | null
  email: string | null
  role: string
}

export interface ExpenseSummary {
  total: number
  count: number
  estimatedTotal: number
  varianceTotal: number
}

export interface ExpenseFormData {
  description: string
  amount: string
  category: string
  date: string
  estimatedAmount: string
  vendor: string
  boardId: string
}

export interface CategoryData {
  category: string
  budgeted: number
  actual: number
  variance: number
  percentUsed: number
  status: 'good' | 'warning' | 'over'
  expenses: Expense[]
  budgetLineItems: BudgetLineItem[]
}
