import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import Layout from '@/components/Layout'
import Button from '@/components/ui/Button'
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns'
import toast from 'react-hot-toast'
import { DollarSign, Calendar, CheckCircle, Clock } from 'lucide-react'

interface EmployeePayroll {
  id: string
  userId: string
  totalMinutes: number
  totalHours: number
  hourlyRate: number | null
  grossPay: number | null
  notes: string | null
  user: {
    id: string
    name: string
    email: string
  }
}

interface PayrollPeriod {
  id: string
  weekStart: string
  weekEnd: string
  status: 'DRAFT' | 'FINALIZED' | 'PAID'
  finalizedAt: string | null
  paidAt: string | null
  notes: string | null
  employeePayroll: EmployeePayroll[]
  finalizer?: { id: string; name: string } | null
  payer?: { id: string; name: string } | null
  _count?: { timeEntries: number }
}

export default function PayrollPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => {
    const today = new Date()
    return format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  })

  const { data: periods, isLoading } = useQuery<PayrollPeriod[]>({
    queryKey: ['payroll-periods', statusFilter],
    queryFn: async () => {
      const params = statusFilter !== 'ALL' ? `?status=${statusFilter}` : ''
      const { data } = await axios.get(`/api/payroll${params}`)
      return data
    },
    enabled: status === 'authenticated' && session?.user?.role === 'ADMIN',
  })

  const createPeriodMutation = useMutation({
    mutationFn: async (payload: { weekStart: string; weekEnd: string }) => {
      const { data } = await axios.post('/api/payroll', payload)
      return data
    },
    onSuccess: () => {
      toast.success('Payroll period created')
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] })
      setShowCreateModal(false)
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Failed to create payroll period'
      toast.error(message)
    },
  })

  const handleCreatePeriod = () => {
    const start = new Date(selectedWeekStart)
    const end = endOfWeek(start, { weekStartsOn: 1 })
    
    createPeriodMutation.mutate({
      weekStart: start.toISOString(),
      weekEnd: end.toISOString(),
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800'
      case 'FINALIZED':
        return 'bg-blue-100 text-blue-800'
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Redirect non-admins
  if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
    router.push('/dashboard')
    return null
  }

  if (status === 'loading' || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payroll Management</h1>
            <p className="text-gray-600 mt-1">Manage weekly payroll periods and employee compensation</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Calendar size={20} className="mr-2" />
            New Period
          </Button>
        </header>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="ALL">All</option>
              <option value="DRAFT">Draft</option>
              <option value="FINALIZED">Finalized</option>
              <option value="PAID">Paid</option>
            </select>
          </div>
        </div>

        {/* Payroll Periods List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employees
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Pay
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {!periods || periods.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500 text-sm">
                      No payroll periods found. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  periods.map((period) => {
                    const totalHours = period.employeePayroll.reduce(
                      (sum, emp) => sum + parseFloat(emp.totalHours.toString()),
                      0
                    )
                    const totalPay = period.employeePayroll.reduce(
                      (sum, emp) => sum + (emp.grossPay ? parseFloat(emp.grossPay.toString()) : 0),
                      0
                    )

                    return (
                      <tr key={period.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {format(new Date(period.weekStart), 'MMM d')} -{' '}
                            {format(new Date(period.weekEnd), 'MMM d, yyyy')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {period._count?.timeEntries || 0} time entries
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {period.employeePayroll.length}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {totalHours.toFixed(2)} hrs
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${totalPay.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                              period.status
                            )}`}
                          >
                            {period.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/payroll/${period.id}`)}
                          >
                            View Details
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Period Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Payroll Period</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Week Starting (Monday)
                  </label>
                  <input
                    type="date"
                    value={selectedWeekStart}
                    onChange={(e) => setSelectedWeekStart(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Period will run from Monday to Sunday
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    disabled={createPeriodMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreatePeriod}
                    disabled={createPeriodMutation.isPending}
                  >
                    {createPeriodMutation.isPending ? 'Creating...' : 'Create Period'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
