import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

// Only ADMIN can access payroll
function isAdmin(role?: string | null) {
  return role === 'ADMIN'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user || !isAdmin(session.user.role)) {
    return res.status(403).json({ error: 'Forbidden - Admin access required' })
  }

  // GET - List payroll periods
  if (req.method === 'GET') {
    try {
      const { status } = req.query

      const where: any = {}
      if (status && typeof status === 'string' && status !== 'ALL') {
        where.status = status
      }

      const periods = await prisma.payrollPeriod.findMany({
        where,
        include: {
          employeePayroll: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          finalizer: {
            select: {
              id: true,
              name: true,
            },
          },
          payer: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              timeEntries: true,
            },
          },
        },
        orderBy: {
          weekStart: 'desc',
        },
        take: 50,
      })

      return res.status(200).json(periods)
    } catch (error) {
      console.error('Error fetching payroll periods:', error)
      return res.status(500).json({ error: 'Failed to fetch payroll periods' })
    }
  }

  // POST - Create/generate new payroll period
  if (req.method === 'POST') {
    try {
      const { weekStart, weekEnd } = req.body

      if (!weekStart || !weekEnd) {
        return res.status(400).json({ error: 'weekStart and weekEnd are required' })
      }

      const start = new Date(weekStart)
      const end = new Date(weekEnd)

      // Check if period already exists
      const existing = await prisma.payrollPeriod.findUnique({
        where: {
          weekStart_weekEnd: {
            weekStart: start,
            weekEnd: end,
          },
        },
      })

      if (existing) {
        return res.status(409).json({ error: 'Payroll period already exists' })
      }

      // Get all approved time entries for this period
      const approvedEntries = await prisma.timeEntry.findMany({
        where: {
          status: 'APPROVED',
          clockIn: {
            gte: start,
            lt: end,
          },
          payrollPeriodId: null, // Only unassigned entries
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      // Group by user
      const userHours = approvedEntries.reduce((acc: any, entry: any) => {
        const userId = entry.userId
        if (!acc[userId]) {
          acc[userId] = {
            user: entry.user,
            totalMinutes: 0,
            entries: [],
          }
        }
        acc[userId].totalMinutes += entry.durationMinutes || 0
        acc[userId].entries.push(entry.id)
        return acc
      }, {})

      // Create payroll period with employee records
      const payrollPeriod = await prisma.payrollPeriod.create({
        data: {
          weekStart: start,
          weekEnd: end,
          status: 'DRAFT',
          employeePayroll: {
            create: Object.entries(userHours).map(([userId, data]: [string, any]) => ({
              userId,
              totalMinutes: data.totalMinutes,
              totalHours: Math.round((data.totalMinutes / 60) * 100) / 100,
            })),
          },
        },
        include: {
          employeePayroll: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      })

      // Link time entries to payroll period
      await prisma.timeEntry.updateMany({
        where: {
          id: {
            in: approvedEntries.map((e) => e.id),
          },
        },
        data: {
          payrollPeriodId: payrollPeriod.id,
        },
      })

      return res.status(201).json(payrollPeriod)
    } catch (error) {
      console.error('Error creating payroll period:', error)
      return res.status(500).json({ error: 'Failed to create payroll period' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
