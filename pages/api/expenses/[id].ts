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
    return res.status(400).json({ error: 'Invalid expense ID' })
  }

  if (req.method === 'GET') {
    try {
      const expense = await prisma.expense.findUnique({
        where: { id },
        include: {
          task: {
            select: {
              id: true,
              title: true
            }
          },
          vendor: {
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
              email: true,
              avatar: true
            }
          },
          lineItems: {
            orderBy: {
              createdAt: 'asc'
            }
          },
          allocations: {
            include: {
              budget: {
                select: {
                  id: true,
                  name: true,
                  amount: true
                }
              },
              budgetLineItem: {
                select: {
                  id: true,
                  name: true,
                  plannedAmount: true
                }
              }
            }
          }
        }
      })

      if (!expense) {
        return res.status(404).json({ error: 'Expense not found' })
      }

      return res.status(200).json(expense)
    } catch (error) {
      console.error('Error fetching expense:', error)
      return res.status(500).json({ error: 'Failed to fetch expense' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
