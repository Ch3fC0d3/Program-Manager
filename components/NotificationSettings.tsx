import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import Button from './ui/Button'
import Select from './ui/Select'
import { Bell, Mail, Smartphone, Moon, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

const NOTIFICATION_TYPES = [
  { value: 'TASK_ASSIGNED', label: 'Task Assigned to Me', description: 'When someone assigns a task to you' },
  { value: 'TASK_COMPLETED', label: 'Task Completed', description: 'When a task you created is marked as done' },
  { value: 'TASK_DUE_SOON', label: 'Task Due Soon', description: 'Reminder before task due date' },
  { value: 'TASK_OVERDUE', label: 'Task Overdue', description: 'When a task passes its due date' },
  { value: 'COMMENT_ADDED', label: 'New Comments', description: 'When someone comments on your tasks' },
  { value: 'COMMENT_MENTION', label: 'Mentions', description: 'When someone @mentions you' },
  { value: 'SUBTASK_COMPLETED', label: 'Subtask Completed', description: 'When a subtask is completed' },
  { value: 'STATUS_CHANGED', label: 'Status Changed', description: 'When task status changes' },
  { value: 'PRIORITY_CHANGED', label: 'Priority Changed', description: 'When task priority changes' },
  { value: 'BOARD_INVITE', label: 'Board Invitations', description: 'When you are added to a board' },
  { value: 'WEEKLY_DIGEST', label: 'Weekly Digest', description: 'Weekly summary of your activity' }
]

export default function NotificationSettings() {
  const queryClient = useQueryClient()
  const [selectedBoard, setSelectedBoard] = useState<string>('')
  const [quietHoursStart, setQuietHoursStart] = useState<number>(22)
  const [quietHoursEnd, setQuietHoursEnd] = useState<number>(8)
  const [preferences, setPreferences] = useState<any[]>([])

  // Fetch boards
  const { data: boards } = useQuery({
    queryKey: ['boards'],
    queryFn: async () => {
      const { data } = await axios.get('/api/boards')
      return data
    }
  })

  // Fetch preferences
  const { data: fetchedPreferences, isLoading } = useQuery({
    queryKey: ['notification-preferences', selectedBoard],
    queryFn: async () => {
      const { data } = await axios.get('/api/user/notification-preferences', {
        params: selectedBoard ? { boardId: selectedBoard } : {}
      })
      return data
    }
  })

  useEffect(() => {
    if (fetchedPreferences) {
      setPreferences(fetchedPreferences)
      // Set quiet hours from first preference if available
      if (fetchedPreferences[0]?.quietHoursStart !== null) {
        setQuietHoursStart(fetchedPreferences[0].quietHoursStart)
      }
      if (fetchedPreferences[0]?.quietHoursEnd !== null) {
        setQuietHoursEnd(fetchedPreferences[0].quietHoursEnd)
      }
    }
  }, [fetchedPreferences])

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Build preferences array with current state
      const prefsToSave = NOTIFICATION_TYPES.map(type => {
        const existing = preferences.find(p => p.notificationType === type.value)
        return {
          notificationType: type.value,
          emailEnabled: existing?.emailEnabled ?? true,
          inAppEnabled: existing?.inAppEnabled ?? true,
          frequency: existing?.frequency || 'IMMEDIATE',
          quietHoursStart,
          quietHoursEnd,
          boardId: selectedBoard || null
        }
      })

      await axios.put('/api/user/notification-preferences', {
        preferences: prefsToSave
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] })
      toast.success('Notification preferences saved')
    },
    onError: () => {
      toast.error('Failed to save preferences')
    }
  })

  const toggleChannel = (notificationType: string, channel: 'email' | 'inApp') => {
    setPreferences(prev => {
      const existing = prev.find(p => p.notificationType === notificationType)
      if (existing) {
        return prev.map(p =>
          p.notificationType === notificationType
            ? {
                ...p,
                [channel === 'email' ? 'emailEnabled' : 'inAppEnabled']:
                  !p[channel === 'email' ? 'emailEnabled' : 'inAppEnabled']
              }
            : p
        )
      } else {
        return [
          ...prev,
          {
            notificationType,
            emailEnabled: channel === 'email' ? true : false,
            inAppEnabled: channel === 'inApp' ? true : false,
            frequency: 'IMMEDIATE'
          }
        ]
      }
    })
  }

  const updateFrequency = (notificationType: string, frequency: string) => {
    setPreferences(prev => {
      const existing = prev.find(p => p.notificationType === notificationType)
      if (existing) {
        return prev.map(p =>
          p.notificationType === notificationType ? { ...p, frequency } : p
        )
      } else {
        return [
          ...prev,
          {
            notificationType,
            emailEnabled: true,
            inAppEnabled: true,
            frequency
          }
        ]
      }
    })
  }

  const getPref = (notificationType: string) => {
    return preferences.find(p => p.notificationType === notificationType) || {
      emailEnabled: true,
      inAppEnabled: true,
      frequency: 'IMMEDIATE'
    }
  }

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading preferences...</div>
  }

  return (
    <div className="space-y-6">
      {/* Board Selector */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Per-Board Settings</h3>
        <p className="text-sm text-blue-700 mb-3">
          Configure different notification preferences for specific boards, or leave unselected for global settings.
        </p>
        <Select
          value={selectedBoard}
          onChange={(e) => setSelectedBoard(e.target.value)}
          options={[
            { value: '', label: 'Global Settings (All Boards)' },
            ...(boards?.map((board: any) => ({
              value: board.id,
              label: board.name
            })) || [])
          ]}
        />
      </div>

      {/* Quiet Hours */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Moon size={20} className="text-gray-600" />
          <h3 className="font-medium text-gray-900">Quiet Hours</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Don&apos;t send notifications during these hours (24-hour format)
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <Select
              value={quietHoursStart.toString()}
              onChange={(e) => setQuietHoursStart(parseInt(e.target.value))}
              options={Array.from({ length: 24 }, (_, i) => ({
                value: i.toString(),
                label: `${i.toString().padStart(2, '0')}:00`
              }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <Select
              value={quietHoursEnd.toString()}
              onChange={(e) => setQuietHoursEnd(parseInt(e.target.value))}
              options={Array.from({ length: 24 }, (_, i) => ({
                value: i.toString(),
                label: `${i.toString().padStart(2, '0')}:00`
              }))}
            />
          </div>
        </div>
      </div>

      {/* Notification Types */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
            <div className="col-span-5">Notification Type</div>
            <div className="col-span-2 text-center">
              <Mail size={16} className="inline mr-1" />
              Email
            </div>
            <div className="col-span-2 text-center">
              <Bell size={16} className="inline mr-1" />
              In-App
            </div>
            <div className="col-span-3 text-center">
              <Clock size={16} className="inline mr-1" />
              Frequency
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {NOTIFICATION_TYPES.map((type) => {
            const pref = getPref(type.value)
            return (
              <div key={type.value} className="px-4 py-4 hover:bg-gray-50">
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-5">
                    <p className="font-medium text-gray-900">{type.label}</p>
                    <p className="text-sm text-gray-500">{type.description}</p>
                  </div>
                  <div className="col-span-2 text-center">
                    <input
                      type="checkbox"
                      checked={pref.emailEnabled}
                      onChange={() => toggleChannel(type.value, 'email')}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2 text-center">
                    <input
                      type="checkbox"
                      checked={pref.inAppEnabled}
                      onChange={() => toggleChannel(type.value, 'inApp')}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-3">
                    <Select
                      value={pref.frequency}
                      onChange={(e) => updateFrequency(type.value, e.target.value)}
                      options={[
                        { value: 'IMMEDIATE', label: 'Immediate' },
                        { value: 'DAILY', label: 'Daily Digest' },
                        { value: 'WEEKLY', label: 'Weekly Digest' }
                      ]}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? 'Saving...' : 'Save All Preferences'}
        </Button>
      </div>
    </div>
  )
}
