import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import Layout from '@/components/Layout'
import Button from '@/components/ui/Button'
import { format } from 'date-fns'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import toast from 'react-hot-toast'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { Wallet, Trash2, History } from 'lucide-react'

interface TimeEntry {
  id: string
  userId: string
  taskId: string | null
  clockIn: string
  clockOut: string | null
  breakMinutes: number
  durationMinutes: number | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  note: string | null
  approvedAt?: string | null
  approvedBy?: {
    id: string
    name: string | null
  } | null
  rejectedReason?: string | null
}

interface ActiveClockEntry extends TimeEntry {}

type ReviewStatusFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'

interface ManagerTimeEntry extends TimeEntry {
  user?: {
    id: string
    name: string | null
    email: string | null
  }
}

function useTimeEntries() {
  return useQuery<TimeEntry[]>({
    queryKey: ['time-entries', 'mine'],
    queryFn: async () => {
      const { data } = await axios.get<TimeEntry[]>('/api/time-entries', {
        params: { scope: 'mine' },
      })
      return data
    },
  })
}

function useActiveClock() {
  return useQuery<ActiveClockEntry | null>({
    queryKey: ['time-entries', 'active'],
    queryFn: async () => {
      const { data } = await axios.get<ActiveClockEntry | null>('/api/time-entries/clock')
      return data
    },
    refetchInterval: 30_000,
  })
}

export default function TimeTrackingPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const router = useRouter()
  const timeEntriesQuery = useTimeEntries()
  const activeClockQuery = useActiveClock()
  const managerRoles = new Set(['ADMIN', 'MANAGER'])
  const canReview = managerRoles.has(session?.user?.role ?? '')
  const [showManualModal, setShowManualModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'review' | 'audit'>('dashboard')
  const [reviewStatus, setReviewStatus] = useState<ReviewStatusFilter>('PENDING')
  const [reviewStartDate, setReviewStartDate] = useState('')
  const [reviewEndDate, setReviewEndDate] = useState('')
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [entryToReject, setEntryToReject] = useState<string | null>(null)
  const [entryToEdit, setEntryToEdit] = useState<TimeEntry | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [formValues, setFormValues] = useState(() => {
    const now = new Date()
    return {
      date: format(now, 'yyyy-MM-dd'),
      startTime: format(now, 'HH:mm'),
      endTime: '',
      breakMinutes: '0',
      note: '',
      taskId: '',
    }
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const resetForm = () => {
    const now = new Date()
    setFormValues({
      date: format(now, 'yyyy-MM-dd'),
      startTime: format(now, 'HH:mm'),
      endTime: '',
      breakMinutes: '0',
      note: '',
      taskId: '',
    })
    setFormErrors({})
  }

  const manualEntryMutation = useMutation({
    mutationFn: async (payload: {
      clockIn: string
      clockOut: string | null
      breakMinutes: number
      note?: string | null
      taskId?: string
    }) => {
      const { data } = await axios.post('/api/time-entries', payload)
      return data
    },
    onSuccess: () => {
      toast.success('Time entry recorded')
      queryClient.invalidateQueries({ queryKey: ['time-entries', 'mine'] })
      queryClient.invalidateQueries({ queryKey: ['time-entries', 'active'] })
      resetForm()
      setShowManualModal(false)
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Failed to save time entry'
      toast.error(message)
    },
  })

  const updateEntryMutation = useMutation({
    mutationFn: async (payload: {
      id: string
      clockIn: string
      clockOut: string | null
      breakMinutes: number
      note?: string | null
      taskId?: string
    }) => {
      const { id, ...updateData } = payload
      const { data } = await axios.put(`/api/time-entries/${id}`, updateData)
      return data
    },
    onSuccess: () => {
      toast.success('Time entry updated')
      queryClient.invalidateQueries({ queryKey: ['time-entries', 'team'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['time-entries', 'mine'] })
      resetForm()
      setShowEditModal(false)
      setEntryToEdit(null)
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Failed to update time entry'
      toast.error(message)
    },
  })

  const clockInMutation = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post('/api/time-entries/clock', {})
      return data
    },
    onSuccess: () => {
      toast.success('Clocked in')
      queryClient.invalidateQueries({ queryKey: ['time-entries', 'mine'] })
      queryClient.invalidateQueries({ queryKey: ['time-entries', 'active'] })
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Failed to clock in'
      toast.error(message)
    },
  })

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const { data } = await axios.patch('/api/time-entries/clock', {})
      return data
    },
    onSuccess: () => {
      toast.success('Clocked out')
      queryClient.invalidateQueries({ queryKey: ['time-entries', 'mine'] })
      queryClient.invalidateQueries({ queryKey: ['time-entries', 'active'] })
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Failed to clock out'
      toast.error(message)
    },
  })

  const reviewEntriesQuery = useQuery<ManagerTimeEntry[]>({
    queryKey: ['time-entries', 'team', { reviewStatus, reviewStartDate, reviewEndDate }],
    queryFn: async () => {
      const params: Record<string, string> = { scope: 'team' }
      if (reviewStatus !== 'ALL') {
        params.status = reviewStatus
      }
      if (reviewStartDate) {
        params.from = reviewStartDate
      }
      if (reviewEndDate) {
        params.to = reviewEndDate
      }

      const { data } = await axios.get<ManagerTimeEntry[]>('/api/time-entries', {
        params,
      })
      return data
    },
    enabled: canReview && activeTab === 'review',
    staleTime: 30_000,
  })

  const approveMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const { data } = await axios.patch(`/api/time-entries/${entryId}`, {
        status: 'APPROVED',
      })
      return data
    },
    onSuccess: () => {
      toast.success('Entry approved')
      queryClient.invalidateQueries({ queryKey: ['time-entries', 'team'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['time-entries', 'mine'] })
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Failed to approve entry'
      toast.error(message)
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async (payload: { entryId: string; reason?: string }) => {
      const { entryId, reason } = payload
      const { data } = await axios.patch(`/api/time-entries/${entryId}`, {
        status: 'REJECTED',
        rejectedReason: reason ?? null,
      })
      return data
    },
    onSuccess: () => {
      toast.success('Entry rejected')
      setRejectModalOpen(false)
      setRejectReason('')
      setEntryToReject(null)
      queryClient.invalidateQueries({ queryKey: ['time-entries', 'team'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['time-entries', 'mine'] })
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Failed to reject entry'
      toast.error(message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (entryId: string) => {
      await axios.delete(`/api/time-entries/${entryId}`)
    },
    onSuccess: () => {
      toast.success('Entry deleted')
      queryClient.invalidateQueries({ queryKey: ['time-entries', 'team'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['time-entries', 'mine'] })
      queryClient.invalidateQueries({ queryKey: ['audit-log'] })
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Failed to delete entry'
      toast.error(message)
    },
  })

  const auditLogQuery = useQuery({
    queryKey: ['audit-log', reviewStartDate, reviewEndDate],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (reviewStartDate) params.append('startDate', reviewStartDate)
      if (reviewEndDate) params.append('endDate', reviewEndDate)
      const { data } = await axios.get(`/api/time-entries/audit-log?${params}`)
      return data
    },
    enabled: canReview && activeTab === 'audit',
    staleTime: 30_000,
  })

  useEffect(() => {
    // Prime manual refetches if we mutate later.
    return () => {
      queryClient.removeQueries({ queryKey: ['time-entries', 'mine'] })
      queryClient.removeQueries({ queryKey: ['time-entries', 'active'] })
    }
  }, [queryClient])

  useEffect(() => {
    if (!canReview && activeTab === 'review') {
      setActiveTab('dashboard')
    }
  }, [canReview, activeTab])

  const todayEntries = useMemo(() => {
    if (!timeEntriesQuery.data) return []
    const today = format(new Date(), 'yyyy-MM-dd')
    return timeEntriesQuery.data.filter((entry) => format(new Date(entry.clockIn), 'yyyy-MM-dd') === today)
  }, [timeEntriesQuery.data])

  const handleFieldChange = (field: keyof typeof formValues) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value
    setFormValues((prev) => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const handleOpenManualModal = () => {
    resetForm()
    setShowManualModal(true)
  }

  const approveEntry = (entryId: string) => {
    approveMutation.mutate(entryId)
  }

  const deleteEntry = (entryId: string) => {
    if (confirm('Are you sure you want to delete this time entry? This action cannot be undone.')) {
      deleteMutation.mutate(entryId)
    }
  }

  const openRejectDialog = (entryId: string) => {
    setEntryToReject(entryId)
    setRejectReason('')
    setRejectModalOpen(true)
  }

  const openEditDialog = (entry: ManagerTimeEntry) => {
    setEntryToEdit(entry as TimeEntry)
    setFormValues({
      date: format(new Date(entry.clockIn), 'yyyy-MM-dd'),
      startTime: format(new Date(entry.clockIn), 'HH:mm'),
      endTime: entry.clockOut ? format(new Date(entry.clockOut), 'HH:mm') : '',
      breakMinutes: String(entry.breakMinutes || 0),
      note: entry.note || '',
      taskId: entry.taskId || '',
    })
    setShowEditModal(true)
  }

  const handleConfirmReject = () => {
    if (!entryToReject) return
    rejectMutation.mutate({ entryId: entryToReject, reason: rejectReason.trim() || undefined })
  }

  const handleManualSubmit = () => {
    const errors: Record<string, string> = {}
    const { date, startTime, endTime, breakMinutes, note, taskId } = formValues

    if (!date) {
      errors.date = 'Date is required'
    }
    if (!startTime) {
      errors.startTime = 'Start time is required'
    }

    const combineDateTime = (d: string, t: string) => {
      if (!d || !t) return null
      const parsed = new Date(`${d}T${t}`)
      return Number.isNaN(parsed.getTime()) ? null : parsed
    }

    const start = combineDateTime(date, startTime)
    if (!start) {
      errors.startTime = errors.startTime || 'Enter a valid start time'
    }

    let end: Date | null = null
    if (endTime) {
      end = combineDateTime(date, endTime)
      if (!end) {
        errors.endTime = 'Enter a valid end time'
      } else if (start && end <= start) {
        errors.endTime = 'End time must be after start time'
      }
    }

    const parsedBreak = breakMinutes.trim() === '' ? 0 : Number.parseInt(breakMinutes, 10)
    if (!Number.isFinite(parsedBreak) || parsedBreak < 0) {
      errors.breakMinutes = 'Break minutes must be zero or a positive number'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    const payload = {
      clockIn: start!.toISOString(),
      clockOut: end ? end.toISOString() : null,
      breakMinutes: parsedBreak,
      note: note.trim() ? note.trim() : null,
      taskId: taskId.trim() ? taskId.trim() : undefined,
    }

    if (entryToEdit) {
      updateEntryMutation.mutate({ id: entryToEdit.id, ...payload })
    } else {
      manualEntryMutation.mutate(payload)
    }
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Time Tracking</h1>
          <p className="text-gray-600">Clock in/out, log hours, and (for managers) review submissions.</p>
        </header>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-3 text-left text-sm font-medium transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-blue-50 text-blue-700'
                  : 'hover:bg-gray-50 text-gray-600'
              }`}
            >
              Employee Dashboard
            </button>
            <button
              onClick={() => setActiveTab('review')}
              className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'review'
                  ? 'bg-blue-50 text-blue-700'
                  : 'hover:bg-gray-50 text-gray-600'
              }`}
              disabled={!canReview}
            >
              Manager Review
              {!canReview && <span className="ml-2 text-xs text-gray-400">(Managers only)</span>}
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'audit'
                  ? 'bg-blue-50 text-blue-700'
                  : 'hover:bg-gray-50 text-gray-600'
              }`}
              disabled={!canReview}
            >
              <History size={16} className="inline mr-2" />
              Audit Log
              {!canReview && <span className="ml-2 text-xs text-gray-400">(Managers only)</span>}
            </button>
          </div>

          {activeTab === 'dashboard' && (
            <div className="p-6 space-y-6">
              <section>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Current Status</p>
                    {activeClockQuery.isLoading ? (
                      <p className="text-lg font-semibold text-gray-900 mt-2">Loading…</p>
                    ) : activeClockQuery.data ? (
                      <div className="mt-2">
                        <p className="text-lg font-semibold text-gray-900">Clocked in at {format(new Date(activeClockQuery.data.clockIn), 'hh:mm a')}</p>
                        <p className="text-sm text-gray-500">
                          {activeClockQuery.data.note ? activeClockQuery.data.note : 'Tracking in progress'}
                        </p>
                      </div>
                    ) : (
                      <p className="text-lg font-semibold text-gray-900 mt-2">Not currently clocked in</p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => clockInMutation.mutate()}
                      disabled={
                        activeClockQuery.isLoading ||
                        Boolean(activeClockQuery.data) ||
                        clockInMutation.isPending
                      }
                    >
                      {clockInMutation.isPending ? 'Clocking In…' : 'Clock In'}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => clockOutMutation.mutate()}
                      disabled={
                        activeClockQuery.isLoading ||
                        !activeClockQuery.data ||
                        clockOutMutation.isPending
                      }
                    >
                      {clockOutMutation.isPending ? 'Clocking Out…' : 'Clock Out'}
                    </Button>
                  </div>
                </div>
              </section>

              <section className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Today&apos;s Entries</h2>
                    <p className="text-sm text-gray-500">Showing entries for {format(new Date(), 'MMMM dd, yyyy')}</p>
                  </div>
                  <Button variant="outline" onClick={handleOpenManualModal}>Add Manual Entry</Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {timeEntriesQuery.isLoading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-10 text-center text-gray-500 text-sm">
                            Loading entries…
                          </td>
                        </tr>
                      ) : todayEntries.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-10 text-center text-gray-500 text-sm">
                            No entries logged today yet.
                          </td>
                        </tr>
                      ) : (
                        todayEntries.map((entry) => (
                          <tr key={entry.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {format(new Date(entry.clockIn), 'hh:mm a')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {entry.clockOut ? format(new Date(entry.clockOut), 'hh:mm a') : '—'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                              {entry.durationMinutes !== null ? `${entry.durationMinutes} min` : 'In progress'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-600">
                                {entry.status.toLowerCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="space-y-1">
                                <div>{entry.note || '—'}</div>
                                {entry.status === 'APPROVED' && entry.approvedBy && (
                                  <p className="text-xs text-gray-400">
                                    Approved by {entry.approvedBy.name ?? 'Manager'} at{' '}
                                    {entry.approvedAt ? format(new Date(entry.approvedAt), 'MMM d, hh:mm a') : 'unknown time'}
                                  </p>
                                )}
                                {entry.status === 'REJECTED' && (
                                  <p className="text-xs text-red-500">
                                    Rejected{entry.rejectedReason ? `: ${entry.rejectedReason}` : ''}
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'review' && canReview && (
            <div className="p-6 space-y-6">
              <section>
                <div className="flex flex-wrap items-end gap-4 justify-between">
                  <div className="flex flex-wrap items-end gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={reviewStatus}
                        onChange={(event) => setReviewStatus(event.target.value as ReviewStatusFilter)}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                      >
                        <option value="PENDING">Pending</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="ALL">All</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">After</label>
                      <input
                        type="date"
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                        value={reviewStartDate}
                        onChange={(event) => setReviewStartDate(event.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Before</label>
                      <input
                        type="date"
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                        value={reviewEndDate}
                        onChange={(event) => setReviewEndDate(event.target.value)}
                      />
                    </div>
                  </div>
                  {session?.user?.role === 'ADMIN' && (
                    <Button
                      variant="secondary"
                      onClick={() => router.push('/payroll')}
                    >
                      <Wallet size={18} className="mr-2" />
                      Manage Payroll
                    </Button>
                  )}
                </div>
              </section>

              <section className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Team Entries</h2>
                    <p className="text-sm text-gray-500">Review and approve submitted time entries.</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Minutes</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {reviewEntriesQuery.isLoading ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-10 text-center text-gray-500 text-sm">
                            Loading entries…
                          </td>
                        </tr>
                      ) : reviewEntriesQuery.isError ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-10 text-center text-sm text-red-500">
                            Failed to load entries.{' '}
                            <button
                              type="button"
                              className="underline text-red-600"
                              onClick={() => reviewEntriesQuery.refetch()}
                            >
                              Try again
                            </button>
                          </td>
                        </tr>
                      ) : reviewEntriesQuery.data && reviewEntriesQuery.data.length > 0 ? (
                        reviewEntriesQuery.data.map((entry) => (
                          <tr key={entry.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.user?.name || 'Unknown'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{format(new Date(entry.clockIn), 'MMM d, yyyy hh:mm a')}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.clockOut ? format(new Date(entry.clockOut), 'MMM d, yyyy hh:mm a') : '—'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{entry.durationMinutes ?? '—'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="space-y-1">
                                <div>{entry.note || '—'}</div>
                                {entry.status === 'REJECTED' && entry.rejectedReason && (
                                  <p className="text-xs text-red-500">Reason: {entry.rejectedReason}</p>
                                )}
                                {entry.status === 'APPROVED' && entry.approvedBy && (
                                  <p className="text-xs text-gray-400">
                                    Approved by {entry.approvedBy.name ?? 'Manager'}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                entry.status === 'APPROVED'
                                  ? 'bg-green-50 text-green-700'
                                  : entry.status === 'REJECTED'
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-yellow-50 text-yellow-700'
                              }`}>
                                {entry.status.toLowerCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditDialog(entry)}
                                  disabled={approveMutation.isPending || rejectMutation.isPending}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => approveEntry(entry.id)}
                                  disabled={approveMutation.isPending || rejectMutation.isPending || entry.status === 'APPROVED'}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openRejectDialog(entry.id)}
                                  disabled={rejectMutation.isPending || approveMutation.isPending || entry.status === 'REJECTED'}
                                >
                                  Reject
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteEntry(entry.id)}
                                  disabled={deleteMutation.isPending}
                                  title="Delete entry"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-6 py-10 text-center text-gray-500 text-sm">
                            No entries match the filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'audit' && canReview && (
            <div className="p-6 space-y-6">
              <section className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900">Audit Log</h2>
                  <p className="text-sm text-gray-500">Track all time entry changes and actions</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {auditLogQuery.isLoading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-10 text-center text-gray-500 text-sm">
                            Loading audit log…
                          </td>
                        </tr>
                      ) : auditLogQuery.isError ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-10 text-center text-sm text-red-500">
                            Failed to load audit log.{' '}
                            <button
                              type="button"
                              className="underline text-red-600"
                              onClick={() => auditLogQuery.refetch()}
                            >
                              Try again
                            </button>
                          </td>
                        </tr>
                      ) : auditLogQuery.data && auditLogQuery.data.length > 0 ? (
                        auditLogQuery.data.map((audit: any) => (
                          <tr key={audit.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {format(new Date(audit.createdAt), 'MMM d, yyyy hh:mm a')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                audit.action === 'DELETE'
                                  ? 'bg-red-50 text-red-700'
                                  : audit.action === 'STATUS_CHANGE'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-gray-50 text-gray-700'
                              }`}>
                                {audit.action}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {audit.actor?.name || 'Unknown'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {audit.timeEntry?.user?.name || 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {audit.action === 'STATUS_CHANGE' && audit.changes && (
                                <div>
                                  {audit.changes.previousStatus} → {audit.changes.newStatus}
                                  {audit.changes.rejectedReason && (
                                    <p className="text-xs text-red-500 mt-1">
                                      Reason: {audit.changes.rejectedReason}
                                    </p>
                                  )}
                                </div>
                              )}
                              {audit.action === 'DELETE' && audit.changes && (
                                <div className="text-xs">
                                  Deleted entry: {audit.changes.durationMinutes || 0} min
                                  {audit.changes.status && ` (${audit.changes.status})`}
                                </div>
                              )}
                              {audit.action === 'UPDATE' && audit.changes && (
                                <div className="text-xs">
                                  Updated: {audit.changes.durationMinutes || 0} min
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-10 text-center text-gray-500 text-sm">
                            No audit log entries found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}
        </div>

        <Modal
          isOpen={showManualModal}
          onClose={() => {
            if (!manualEntryMutation.isPending) {
              setShowManualModal(false)
            }
          }}
          title="Log Manual Time"
          size="md"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  if (!manualEntryMutation.isPending) {
                    setShowManualModal(false)
                    resetForm()
                  }
                }}
                disabled={manualEntryMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleManualSubmit}
                disabled={manualEntryMutation.isPending}
              >
                {manualEntryMutation.isPending ? 'Saving…' : 'Save Entry'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                type="date"
                label="Date"
                value={formValues.date}
                onChange={handleFieldChange('date')}
                error={formErrors.date}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
              <Input
                type="text"
                label="Task ID (optional)"
                placeholder="Link to a task"
                value={formValues.taskId}
                onChange={handleFieldChange('taskId')}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                type="time"
                label="Start Time"
                value={formValues.startTime}
                onChange={handleFieldChange('startTime')}
                error={formErrors.startTime}
              />
              <Input
                type="time"
                label="End Time (optional)"
                value={formValues.endTime}
                onChange={handleFieldChange('endTime')}
                error={formErrors.endTime}
              />
              <Input
                type="number"
                min={0}
                label="Break Minutes"
                value={formValues.breakMinutes}
                onChange={handleFieldChange('breakMinutes')}
                error={formErrors.breakMinutes}
              />
            </div>
            <Textarea
              label="Notes"
              placeholder="Add context for this time entry"
              value={formValues.note}
              onChange={handleFieldChange('note')}
              rows={4}
            />
            {manualEntryMutation.isError && !manualEntryMutation.isPending && (
              <p className="text-sm text-red-600">Something went wrong. Please try again.</p>
            )}
          </div>
        </Modal>

        <Modal
          isOpen={showEditModal}
          onClose={() => {
            if (!updateEntryMutation.isPending) {
              setShowEditModal(false)
              setEntryToEdit(null)
              resetForm()
            }
          }}
          title="Edit Time Entry"
          size="md"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  if (!updateEntryMutation.isPending) {
                    setShowEditModal(false)
                    setEntryToEdit(null)
                    resetForm()
                  }
                }}
                disabled={updateEntryMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleManualSubmit}
                disabled={updateEntryMutation.isPending}
              >
                {updateEntryMutation.isPending ? 'Updating…' : 'Update Entry'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                type="date"
                label="Date"
                value={formValues.date}
                onChange={handleFieldChange('date')}
                error={formErrors.date}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
              <Input
                type="text"
                label="Task ID (optional)"
                placeholder="Link to a task"
                value={formValues.taskId}
                onChange={handleFieldChange('taskId')}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                type="time"
                label="Start Time"
                value={formValues.startTime}
                onChange={handleFieldChange('startTime')}
                error={formErrors.startTime}
              />
              <Input
                type="time"
                label="End Time (optional)"
                value={formValues.endTime}
                onChange={handleFieldChange('endTime')}
                error={formErrors.endTime}
              />
              <Input
                type="number"
                min={0}
                label="Break Minutes"
                value={formValues.breakMinutes}
                onChange={handleFieldChange('breakMinutes')}
                error={formErrors.breakMinutes}
              />
            </div>
            <Textarea
              label="Notes"
              placeholder="Add context for this time entry"
              value={formValues.note}
              onChange={handleFieldChange('note')}
              rows={4}
            />
            {updateEntryMutation.isError && !updateEntryMutation.isPending && (
              <p className="text-sm text-red-600">Something went wrong. Please try again.</p>
            )}
          </div>
        </Modal>

        <Modal
          isOpen={rejectModalOpen}
          onClose={() => {
            if (!rejectMutation.isPending) {
              setRejectModalOpen(false)
              setRejectReason('')
              setEntryToReject(null)
            }
          }}
          title="Reject Time Entry"
          size="sm"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  if (!rejectMutation.isPending) {
                    setRejectModalOpen(false)
                    setRejectReason('')
                    setEntryToReject(null)
                  }
                }}
                disabled={rejectMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmReject}
                disabled={rejectMutation.isPending || !entryToReject}
              >
                {rejectMutation.isPending ? 'Rejecting…' : 'Reject Entry'}
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Optionally add a reason for rejecting this entry. The employee will see this message.
            </p>
            <Textarea
              label="Reason"
              placeholder="Provide feedback (optional)"
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              rows={4}
              disabled={rejectMutation.isPending}
            />
          </div>
        </Modal>
      </div>
    </Layout>
  )
}
