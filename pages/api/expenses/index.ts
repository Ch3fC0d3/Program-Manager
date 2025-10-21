import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // GET - List expenses
  if (req.method === 'GET') {
    try {
      const { vendorId, boardId, startDate, endDate, category } = req.query

      const where: any = {
        createdById: session.user.id
      }

      if (vendorId) where.vendorId = vendorId as string
      if (boardId) where.boardId = boardId as string
      if (category) where.category = category as string
      
      if (startDate || endDate) {
        where.date = {}
        if (startDate) where.date.gte = new Date(startDate as string)
        if (endDate) where.date.lte = new Date(endDate as string)
      }

      const expenses = await prisma.expense.findMany({
        where,
        include: {
          vendor: {
            select: {
              id: true,
              title: true,
              customFields: true
            }
          },
          task: {
            select: {
              id: true,
              title: true
            }
          },
          board: {
            select: {
              id: true,
              name: true,
              color: true
            }
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          date: 'desc'
        }
      })

      // Calculate totals
      const total = expenses.reduce((sum, exp) => sum + exp.amount, 0)
      const byCategory = expenses.reduce((acc: any, exp) => {
        const cat = exp.category || 'Uncategorized'
        acc[cat] = (acc[cat] || 0) + exp.amount
        return acc
      }, {})

      return res.status(200).json({
        expenses,
        summary: {
          total,
          count: expenses.length,
          byCategory
        }
      })
    } catch (error) {
      console.error('Error fetching expenses:', error)
      return res.status(500).json({ error: 'Failed to fetch expenses' })
    }
  }

  // POST - Create expense
  if (req.method === 'POST') {
    try {
      const {
        amount,
        currency = 'USD',
        vendorId,
        taskId,
        boardId,
        category,
        description,
        date,
        receiptUrl,
        receiptData,
        aiVendorName,
        aiConfidence,
        aiExtractedData
      } = req.body

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid amount is required' })
      }

      const expense = await prisma.expense.create({
        data: {
          amount: parseFloat(amount),
          currency,
          vendorId: vendorId || null,
          taskId: taskId || null,
          boardId: boardId || null,
          category: category || null,
          description: description || null,
          date: date ? new Date(date) : new Date(),
          receiptUrl: receiptUrl || null,
          receiptData: receiptData || null,
          aiVendorName: aiVendorName || null,
          aiConfidence: aiConfidence || null,
          aiExtractedData: aiExtractedData || null,
          createdById: session.user.id
        },
        include: {
          vendor: {
            select: {
              id: true,
              title: true
            }
          },
          createdBy: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      // Log activity
      await prisma.activity.create({
        data: {
          userId: session.user.id,
          action: 'expense_created',
          details: {
            expenseId: expense.id,
            amount: expense.amount,
            vendor: expense.vendor?.title || aiVendorName,
            category: category
          }
        }
      })

      return res.status(201).json(expense)
    } catch (error) {
      console.error('Error creating expense:', error)
      return res.status(500).json({ error: 'Failed to create expense' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
