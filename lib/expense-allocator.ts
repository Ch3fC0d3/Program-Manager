import { prisma } from './prisma'

interface AllocationResult {
  budgetId: string
  budgetLineItemId: string | null
  amount: number
  notes: string
}

/**
 * Automatically allocates an expense to matching budget line items
 * based on category, board, vendor, and date range
 */
export async function autoAllocateExpense(expenseId: string): Promise<AllocationResult[]> {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      lineItems: true
    }
  })

  if (!expense) {
    throw new Error('Expense not found')
  }

  const allocations: AllocationResult[] = []

  // Find matching budgets
  const matchingBudgets = await prisma.budget.findMany({
    where: {
      AND: [
        // Date range match
        { startDate: { lte: expense.date } },
        {
          OR: [
            { endDate: null },
            { endDate: { gte: expense.date } }
          ]
        },
        // Board match (if expense has board)
        expense.boardId ? { boardId: expense.boardId } : {},
        // Vendor match (if expense has vendor)
        expense.vendorId ? { vendorId: expense.vendorId } : {}
      ]
    },
    include: {
      lineItems: {
        where: {
          AND: [
            { periodStart: { lte: expense.date } },
            {
              OR: [
                { periodEnd: null },
                { periodEnd: { gte: expense.date } }
              ]
            }
          ]
        }
      }
    }
  })

  if (matchingBudgets.length === 0) {
    return allocations
  }

  // If expense has line items, try to allocate each to matching budget line items
  if (expense.lineItems && expense.lineItems.length > 0) {
    for (const expenseLineItem of expense.lineItems) {
      let allocated = false

      for (const budget of matchingBudgets) {
        // Find budget line item matching the category
        const matchingLineItem = budget.lineItems.find(
          li => li.category?.toLowerCase() === expenseLineItem.category?.toLowerCase()
        )

        if (matchingLineItem) {
          // Check if there's enough budget remaining
          const existingAllocations = await prisma.expenseAllocation.findMany({
            where: { budgetLineItemId: matchingLineItem.id }
          })

          const totalAllocated = existingAllocations.reduce((sum, a) => sum + a.amount, 0)
          const remaining = matchingLineItem.plannedAmount - totalAllocated

          if (remaining >= expenseLineItem.totalAmount) {
            allocations.push({
              budgetId: budget.id,
              budgetLineItemId: matchingLineItem.id,
              amount: expenseLineItem.totalAmount,
              notes: `Auto-allocated: ${expenseLineItem.description}`
            })
            allocated = true
            break
          }
        }
      }

      // If no line item match, allocate to budget with matching category
      if (!allocated) {
        const categoryBudget = matchingBudgets.find(
          b => b.category?.toLowerCase() === expenseLineItem.category?.toLowerCase()
        )

        if (categoryBudget) {
          allocations.push({
            budgetId: categoryBudget.id,
            budgetLineItemId: null,
            amount: expenseLineItem.totalAmount,
            notes: `Auto-allocated to budget: ${expenseLineItem.description}`
          })
        }
      }
    }
  } else {
    // No line items - allocate entire expense
    // Try to match by category first
    const categoryMatch = matchingBudgets.find(
      b => b.category?.toLowerCase() === expense.category?.toLowerCase()
    )

    if (categoryMatch) {
      // Try to find a matching line item
      const matchingLineItem = categoryMatch.lineItems.find(
        li => li.category?.toLowerCase() === expense.category?.toLowerCase()
      )

      if (matchingLineItem) {
        const existingAllocations = await prisma.expenseAllocation.findMany({
          where: { budgetLineItemId: matchingLineItem.id }
        })

        const totalAllocated = existingAllocations.reduce((sum, a) => sum + a.amount, 0)
        const remaining = matchingLineItem.plannedAmount - totalAllocated

        if (remaining >= expense.amount) {
          allocations.push({
            budgetId: categoryMatch.id,
            budgetLineItemId: matchingLineItem.id,
            amount: expense.amount,
            notes: `Auto-allocated by category: ${expense.category}`
          })
        }
      } else {
        // No line item, allocate to budget directly
        allocations.push({
          budgetId: categoryMatch.id,
          budgetLineItemId: null,
          amount: expense.amount,
          notes: `Auto-allocated to ${categoryMatch.name}`
        })
      }
    } else if (matchingBudgets.length > 0) {
      // No category match, use first matching budget
      const budget = matchingBudgets[0]
      allocations.push({
        budgetId: budget.id,
        budgetLineItemId: null,
        amount: expense.amount,
        notes: `Auto-allocated to ${budget.name} (no category match)`
      })
    }
  }

  // Create the allocations in the database
  if (allocations.length > 0) {
    await prisma.expenseAllocation.createMany({
      data: allocations.map(alloc => ({
        budgetId: alloc.budgetId,
        budgetLineItemId: alloc.budgetLineItemId,
        expenseId: expense.id,
        amount: alloc.amount,
        currency: expense.currency,
        notes: alloc.notes
      }))
    })
  }

  return allocations
}

/**
 * Updates budget snapshots for a given budget line item
 */
export async function updateBudgetSnapshot(budgetLineItemId: string): Promise<void> {
  const budgetLineItem = await prisma.budgetLineItem.findUnique({
    where: { id: budgetLineItemId },
    include: {
      allocations: true
    }
  })

  if (!budgetLineItem) {
    return
  }

  const actualAmount = budgetLineItem.allocations.reduce((sum, a) => sum + a.amount, 0)
  const variance = budgetLineItem.plannedAmount - actualAmount

  // Upsert snapshot for the current period using findFirst + update/create
  const existingSnapshot = await prisma.budgetSnapshot.findFirst({
    where: {
      budgetLineItemId: budgetLineItem.id,
      periodStart: budgetLineItem.periodStart
    }
  })

  if (existingSnapshot) {
    await prisma.budgetSnapshot.update({
      where: { id: existingSnapshot.id },
      data: {
        actualAmount,
        variance,
        plannedAmount: budgetLineItem.plannedAmount
      }
    })
  } else {
    await prisma.budgetSnapshot.create({
      data: {
        budgetLineItemId: budgetLineItem.id,
        periodStart: budgetLineItem.periodStart,
        periodEnd: budgetLineItem.periodEnd || new Date(budgetLineItem.periodStart.getFullYear(), budgetLineItem.periodStart.getMonth() + 3, 0),
        plannedAmount: budgetLineItem.plannedAmount,
        actualAmount,
        variance,
        currency: budgetLineItem.currency
      }
    })
  }
}
