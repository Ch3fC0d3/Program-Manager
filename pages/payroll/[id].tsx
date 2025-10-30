import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import Layout from '@/components/Layout'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import toast from 'react-hot-toast'
import { ArrowLeft, DollarSign, Clock, CheckCircle, AlertCircle, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function PayrollPeriodDetail() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { id } = router.query
  const queryClient = useQueryClient()
  const [showFinalizeModal, setShowFinalizeModal] = useState(false)
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingRates, setEditingRates] = useState(false)
  const [employeeRates, setEmployeeRates] = useState<Record<string, { hourlyRate: number; grossPay: number }>>({})

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  const { data: period, isLoading } = useQuery({
    queryKey: ['payroll-period', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/payroll/${id}`)
      return data
    },
    enabled: !!id && status === 'authenticated' && session?.user?.role === 'ADMIN',
  })

  // Initialize employee rates when period loads
  useEffect(() => {
    if (period?.employeePayroll) {
      const rates: Record<string, { hourlyRate: number; grossPay: number }> = {}
      period.employeePayroll.forEach((emp: any) => {
        rates[emp.id] = {
          hourlyRate: emp.hourlyRate,
          grossPay: emp.grossPay,
        }
      })
      setEmployeeRates(rates)
    }
  }, [period])

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await axios.patch(`/api/payroll/${id}`, { action: 'finalize' })
      return data
    },
    onSuccess: () => {
      toast.success('Payroll period finalized')
      queryClient.invalidateQueries({ queryKey: ['payroll-period', id] })
      setShowFinalizeModal(false)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to finalize payroll')
    },
  })

  const markPaidMutation = useMutation({
    mutationFn: async () => {
      const { data } = await axios.patch(`/api/payroll/${id}`, { action: 'mark_paid' })
      return data
    },
    onSuccess: () => {
      toast.success('Payroll marked as paid')
      queryClient.invalidateQueries({ queryKey: ['payroll-period', id] })
      setShowMarkPaidModal(false)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to mark payroll as paid')
    },
  })

  const updateRatesMutation = useMutation({
    mutationFn: async () => {
      const employeePayroll = Object.entries(employeeRates).map(([id, rates]) => ({
        id,
        ...rates,
      }))
      const { data } = await axios.patch(`/api/payroll/${id}`, {
        action: 'update_employees',
        employeePayroll,
      })
      return data
    },
    onSuccess: () => {
      toast.success('Employee rates updated')
      queryClient.invalidateQueries({ queryKey: ['payroll-period', id] })
      setEditingRates(false)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to update rates')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await axios.delete(`/api/payroll/${id}`)
    },
    onSuccess: () => {
      toast.success('Payroll period deleted')
      router.push('/payroll')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to delete payroll period')
    },
  })

  const updateEmployeeRate = (empId: string, field: 'hourlyRate' | 'grossPay', value: number) => {
    setEmployeeRates((prev) => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [field]: value,
      },
    }))
  }

  if (status === 'loading' || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  if (!period) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-16 text-center">
          <p className="text-gray-500">Payroll period not found.</p>
          <Button className="mt-4" onClick={() => router.push('/payroll')}>
            Back to Payroll
          </Button>
        </div>
      </Layout>
    )
  }

  const statusColors = {
    DRAFT: 'bg-gray-100 text-gray-700',
    FINALIZED: 'bg-blue-100 text-blue-700',
    PAID: 'bg-green-100 text-green-700',
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/payroll')}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft size={16} className="mr-1" /> Back to Payroll
            </button>
          </div>
          <div className="flex gap-2">
            {period.status === 'DRAFT' && (
              <>
                <Button variant="outline" onClick={() => setEditingRates(!editingRates)}>
                  {editingRates ? 'Cancel Edit' : 'Edit Rates'}
                </Button>
                <Button onClick={() => setShowFinalizeModal(true)}>
                  <CheckCircle size={18} className="mr-2" />
                  Finalize
                </Button>
                <Button variant="destructive" onClick={() => setShowDeleteModal(true)}>
                  <Trash2 size={18} className="mr-2" />
                  Delete
                </Button>
              </>
            )}
            {period.status === 'FINALIZED' && (
              <Button onClick={() => setShowMarkPaidModal(true)}>
                <DollarSign size={18} className="mr-2" />
                Mark as Paid
              </Button>
            )}
          </div>
        </div>

        {/* Period Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Payroll Period: {formatDate(period.weekStart)} - {formatDate(period.weekEnd)}
            </h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[period.status as keyof typeof statusColors]}`}>
              {period.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Total Employees</div>
              <div className="text-2xl font-bold text-gray-900">{period.employeePayroll?.length || 0}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Total Hours</div>
              <div className="text-2xl font-bold text-gray-900">{(period.totalHours || 0).toFixed(2)}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Total Gross Pay</div>
              <div className="text-2xl font-bold text-gray-900">${(period.totalGrossPay || 0).toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Employee Payroll */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Employee Payroll</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hours Worked
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hourly Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gross Pay
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {period.employeePayroll?.map((emp: any) => (
                  <tr key={emp.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{emp.user?.name || emp.user?.email || 'Unknown'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{(emp.hoursWorked || 0).toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingRates && period.status === 'DRAFT' ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={employeeRates[emp.id]?.hourlyRate || 0}
                          onChange={(e) => updateEmployeeRate(emp.id, 'hourlyRate', parseFloat(e.target.value) || 0)}
                          className="w-24"
                        />
                      ) : (
                        <div className="text-sm text-gray-900">${(emp.hourlyRate || 0).toFixed(2)}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingRates && period.status === 'DRAFT' ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={employeeRates[emp.id]?.grossPay || 0}
                          onChange={(e) => updateEmployeeRate(emp.id, 'grossPay', parseFloat(e.target.value) || 0)}
                          className="w-24"
                        />
                      ) : (
                        <div className="text-sm font-medium text-gray-900">${(emp.grossPay || 0).toFixed(2)}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editingRates && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingRates(false)}>
                Cancel
              </Button>
              <Button onClick={() => updateRatesMutation.mutate()} disabled={updateRatesMutation.isPending}>
                {updateRatesMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </div>

        {/* Finalize Modal */}
        <Modal
          isOpen={showFinalizeModal}
          onClose={() => setShowFinalizeModal(false)}
          title="Finalize Payroll Period"
          footer={
            <>
              <Button variant="outline" onClick={() => setShowFinalizeModal(false)}>
                Cancel
              </Button>
              <Button onClick={() => finalizeMutation.mutate()} disabled={finalizeMutation.isPending}>
                {finalizeMutation.isPending ? 'Finalizing...' : 'Finalize'}
              </Button>
            </>
          }
        >
          <p className="text-sm text-gray-600">
            Are you sure you want to finalize this payroll period? Once finalized, you cannot edit employee rates.
          </p>
        </Modal>

        {/* Mark Paid Modal */}
        <Modal
          isOpen={showMarkPaidModal}
          onClose={() => setShowMarkPaidModal(false)}
          title="Mark as Paid"
          footer={
            <>
              <Button variant="outline" onClick={() => setShowMarkPaidModal(false)}>
                Cancel
              </Button>
              <Button onClick={() => markPaidMutation.mutate()} disabled={markPaidMutation.isPending}>
                {markPaidMutation.isPending ? 'Processing...' : 'Mark as Paid'}
              </Button>
            </>
          }
        >
          <p className="text-sm text-gray-600">
            Confirm that all employees have been paid for this period. This action cannot be undone.
          </p>
        </Modal>

        {/* Delete Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Payroll Period"
          footer={
            <>
              <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </>
          }
        >
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this draft payroll period? This will unlink all time entries. This action cannot be undone.
          </p>
        </Modal>
      </div>
    </Layout>
  )
}
