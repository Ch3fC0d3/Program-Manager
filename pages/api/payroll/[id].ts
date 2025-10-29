import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

function isAdmin(role?: string | null) {
  return role === 'ADMIN'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user || !isAdmin(session.user.role)) {
    return res.status(403).json({ error: 'Forbidden - Admin access required' })
  }

  const periodId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id
  if (!periodId) {
    return res.status(400).json({ error: 'Period ID is required' })
  }

  // GET - Get single payroll period with details
  if (req.method === 'GET') {
    try {
      const period = await (prisma as any).payrollPeriod.findUnique({
        where: { id: periodId },
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
          timeEntries: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
              task: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
            orderBy: {
              clockIn: 'asc',
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
        },
      })

      if (!period) {
        return res.status(404).json({ error: 'Payroll period not found' })
      }

      return res.status(200).json(period)
    } catch (error) {
      console.error('Error fetching payroll period:', error)
      return res.status(500).json({ error: 'Failed to fetch payroll period' })
    }
  }

  // PATCH - Update payroll period (finalize, mark as paid, update rates)
  if (req.method === 'PATCH') {
    try {
      const { action, employeePayroll } = req.body

      const existing = await (prisma as any).payrollPeriod.findUnique({
        where: { id: periodId },
        select: { status: true },
      })

      if (!existing) {
        return res.status(404).json({ error: 'Payroll period not found' })
      }

      // Finalize payroll
      if (action === 'finalize') {
        if (existing.status !== 'DRAFT') {
          return res.status(400).json({ error: 'Can only finalize DRAFT payroll' })
        }

        const updated = await (prisma as any).payrollPeriod.update({
          where: { id: periodId },
          data: {
            status: 'FINALIZED',
            finalizedAt: new Date(),
            finalizedBy: session.user.id,
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

        return res.status(200).json(updated)
      }

      // Mark as paid
      if (action === 'mark_paid') {
        if (existing.status !== 'FINALIZED') {
          return res.status(400).json({ error: 'Can only mark FINALIZED payroll as paid' })
        }

        const updated = await (prisma as any).payrollPeriod.update({
          where: { id: periodId },
          data: {
            status: 'PAID',
            paidAt: new Date(),
            paidBy: session.user.id,
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

        return res.status(200).json(updated)
      }

      // Update employee payroll records (rates and gross pay)
      if (action === 'update_employees' && employeePayroll && Array.isArray(employeePayroll)) {
        if (existing.status === 'PAID') {
          return res.status(400).json({ error: 'Cannot update paid payroll' })
        }

        // Update each employee payroll record
        await Promise.all(
          employeePayroll.map((emp: any) =>
            (prisma as any).employeePayroll.update({
              where: { id: emp.id },
              data: {
                hourlyRate: emp.hourlyRate ? parseFloat(emp.hourlyRate) : null,
                grossPay: emp.grossPay ? parseFloat(emp.grossPay) : null,
                notes: emp.notes || null,
              },
            })
          )
        )

        const updated = await (prisma as any).payrollPeriod.findUnique({
          where: { id: periodId },
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

        return res.status(200).json(updated)
      }

      return res.status(400).json({ error: 'Invalid action' })
    } catch (error) {
      console.error('Error updating payroll period:', error)
      return res.status(500).json({ error: 'Failed to update payroll period' })
    }
  }

  // DELETE - Delete draft payroll period
  if (req.method === 'DELETE') {
    try {
      const existing = await (prisma as any).payrollPeriod.findUnique({
        where: { id: periodId },
        select: { status: true },
      })

      if (!existing) {
        return res.status(404).json({ error: 'Payroll period not found' })
      }

      if (existing.status !== 'DRAFT') {
        return res.status(400).json({ error: 'Can only delete DRAFT payroll' })
      }

      // Unlink time entries
      await prisma.timeEntry.updateMany({
        where: { payrollPeriodId: periodId },
        data: { payrollPeriodId: null },
      })

      // Delete payroll period (cascades to employee payroll)
      await (prisma as any).payrollPeriod.delete({
        where: { id: periodId },
      })

      return res.status(200).json({ message: 'Payroll period deleted' })
    } catch (error) {
      console.error('Error deleting payroll period:', error)
      return res.status(500).json({ error: 'Failed to delete payroll period' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
