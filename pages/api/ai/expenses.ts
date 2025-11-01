import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

/**
 * AI Expense Data Access API
 * 
 * This endpoint provides comprehensive expense data for AI analysis.
 * All expense information including line items, attachments, allocations,
 * and AI-extracted data is accessible here.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    try {
      const { 
        category, 
        vendor, 
        boardId,
        dateFrom,
        dateTo,
        minAmount,
        maxAmount,
        limit = '100'
      } = req.query

      // Build filter conditions
      const where: any = {}

      if (category) {
        where.category = category as string
      }

      if (vendor) {
        where.aiVendorName = {
          contains: vendor as string,
          mode: 'insensitive'
        }
      }

      if (boardId) {
        where.boardId = boardId as string
      }

      if (dateFrom || dateTo) {
        where.date = {}
        if (dateFrom) {
          where.date.gte = new Date(dateFrom as string)
        }
        if (dateTo) {
          where.date.lte = new Date(dateTo as string)
        }
      }

      if (minAmount || maxAmount) {
        where.amount = {}
        if (minAmount) {
          where.amount.gte = parseFloat(minAmount as string)
        }
        if (maxAmount) {
          where.amount.lte = parseFloat(maxAmount as string)
        }
      }

      // Fetch expenses with all related data
      const expenses = await prisma.expense.findMany({
        where,
        take: parseInt(limit as string),
        orderBy: { date: 'desc' },
        include: {
          board: {
            select: {
              id: true,
              name: true
            }
          },
          lineItems: {
            select: {
              id: true,
              description: true,
              quantity: true,
              unitCost: true,
              totalAmount: true,
              category: true
            }
          },
          attachments: {
            select: {
              id: true,
              filename: true,
              url: true,
              mimeType: true,
              size: true,
              createdAt: true
            }
          },
          allocations: {
            include: {
              budget: {
                select: {
                  id: true,
                  name: true,
                  amount: true,
                  period: true,
                  category: true
                }
              }
            }
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })

      // Calculate summary statistics
      const summary = {
        totalExpenses: expenses.length,
        totalAmount: expenses.reduce((sum, exp) => sum + exp.amount, 0),
        totalEstimated: expenses.reduce((sum, exp) => sum + (exp.estimatedAmount || 0), 0),
        averageAmount: expenses.length > 0 
          ? expenses.reduce((sum, exp) => sum + exp.amount, 0) / expenses.length 
          : 0,
        categories: Array.from(new Set(expenses.map(e => e.category).filter(Boolean))),
        vendors: Array.from(new Set(expenses.map(e => e.aiVendorName).filter(Boolean))),
        dateRange: expenses.length > 0 ? {
          earliest: new Date(Math.min(...expenses.map(e => new Date(e.date).getTime()))),
          latest: new Date(Math.max(...expenses.map(e => new Date(e.date).getTime())))
        } : null
      }

      // Format response for AI consumption
      const response = {
        success: true,
        summary,
        expenses: expenses.map(expense => ({
          // Basic info
          id: expense.id,
          description: expense.description,
          amount: expense.amount,
          estimatedAmount: expense.estimatedAmount,
          variance: expense.estimatedAmount 
            ? expense.amount - expense.estimatedAmount 
            : null,
          category: expense.category,
          date: expense.date,
          
          // Vendor/Contact info
          vendor: expense.aiVendorName,
          
          // Board/Project
          board: expense.board,
          
          // Line items breakdown
          lineItems: expense.lineItems,
          lineItemsTotal: expense.lineItems.reduce((sum, item) => sum + (item.totalAmount || 0), 0),
          lineItemsCount: expense.lineItems.length,
          
          // Attachments
          attachments: expense.attachments,
          hasReceipt: expense.attachments.length > 0,
          
          // Budget allocations
          allocations: expense.allocations,
          totalAllocated: expense.allocations.reduce((sum, alloc) => sum + alloc.amount, 0),
          budgets: expense.allocations.map(alloc => alloc.budget),
          
          // AI extracted data
          aiExtractedData: expense.aiExtractedData,
          hasAIData: !!expense.aiExtractedData,
          
          // Metadata
          createdAt: expense.createdAt,
          createdBy: expense.createdBy,
          updatedAt: expense.updatedAt
        })),
        
        // Metadata for AI context
        metadata: {
          endpoint: '/api/ai/expenses',
          purpose: 'Comprehensive expense data for AI analysis',
          filters: {
            category: category || null,
            vendor: vendor || null,
            boardId: boardId || null,
            dateFrom: dateFrom || null,
            dateTo: dateTo || null,
            minAmount: minAmount || null,
            maxAmount: maxAmount || null
          },
          timestamp: new Date().toISOString()
        }
      }

      return res.status(200).json(response)
    } catch (error) {
      console.error('Error fetching expenses for AI:', error)
      return res.status(500).json({ 
        error: 'Failed to fetch expense data',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  res.setHeader('Allow', 'GET')
  return res.status(405).json({ error: 'Method not allowed' })
}
