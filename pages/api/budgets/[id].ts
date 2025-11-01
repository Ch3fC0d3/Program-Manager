import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user || session.user.role !== 'ADMIN') {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id } = req.query

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid budget ID' })
  }

  if (req.method === 'GET') {
    try {
      const budget = await prisma.budget.findUnique({
        where: { id },
        include: {
          board: {
            select: {
              id: true,
              name: true,
              color: true
            }
          },
          vendor: {
            select: {
              id: true,
              title: true
            }
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          lineItems: {
            include: {
              allocations: {
                include: {
                  expense: {
                    select: {
                      id: true,
                      amount: true,
                      description: true,
                      category: true,
                      date: true
                    }
                  }
                }
              }
            }
          },
          allocations: {
            include: {
              expense: {
                select: {
                  id: true,
                  amount: true,
                  description: true,
                  category: true,
                  date: true,
                  aiVendorName: true
                }
              }
            }
          }
        }
      })

      if (!budget) {
        return res.status(404).json({ error: 'Budget not found' })
      }

      return res.status(200).json(budget)
    } catch (error) {
      console.error('Error fetching budget:', error)
      return res.status(500).json({ error: 'Failed to fetch budget' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.budget.delete({
        where: { id }
      })
      return res.status(200).json({ success: true, message: 'Budget deleted' })
    } catch (error) {
      console.error('Error deleting budget:', error)
      return res.status(500).json({ error: 'Failed to delete budget' })
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { name, amount, period, category, startDate, endDate } = req.body
      
      const budget = await prisma.budget.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(amount !== undefined && { amount }),
          ...(period && { period }),
          ...(category !== undefined && { category }),
          ...(startDate && { startDate: new Date(startDate) }),
          ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null })
        }
      })
      
      return res.status(200).json(budget)
    } catch (error) {
      console.error('Error updating budget:', error)
      return res.status(500).json({ error: 'Failed to update budget' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
