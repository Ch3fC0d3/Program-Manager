import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import Button from './ui/Button'
import { Bell, Mail, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const NOTIFICATION_TYPES = [
  { id: 'taskAssigned', label: 'Task Assignments', description: 'When someone assigns a task to you' },
  { id: 'taskDueSoon', label: 'Task Due Reminders', description: 'Reminders before task due dates' },
  { id: 'comments', label: 'Comments & Mentions', description: 'When someone comments or mentions you' },
  { id: 'boardInvites', label: 'Board Invitations', description: 'When you are added to a board' },
  { id: 'weeklyDigest', label: 'Weekly Summary', description: 'Weekly summary of your activity' }
]

export default function NotificationSettings() {
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [taskReminders, setTaskReminders] = useState(true)
  const [commentNotifications, setCommentNotifications] = useState(true)
  const [boardInvites, setBoardInvites] = useState(true)
  const [weeklyDigest, setWeeklyDigest] = useState(false)

  const saveMutation = useMutation({
    mutationFn: async () => {
      await axios.put('/api/user/notifications', {
        emailNotifications,
        taskReminders,
        commentNotifications,
        boardInvites,
        weeklyDigest
      })
    },
    onSuccess: () => {
      toast.success('Notification preferences saved')
    },
    onError: () => {
      toast.error('Failed to save preferences')
    }
  })

  const getToggleState = (id: string) => {
    switch (id) {
      case 'taskAssigned': return taskReminders
      case 'taskDueSoon': return taskReminders
      case 'comments': return commentNotifications
      case 'boardInvites': return boardInvites
      case 'weeklyDigest': return weeklyDigest
      default: return false
    }
  }

  const handleToggle = (id: string) => {
    switch (id) {
      case 'taskAssigned':
      case 'taskDueSoon':
        setTaskReminders(!taskReminders)
        break
      case 'comments':
        setCommentNotifications(!commentNotifications)
        break
      case 'boardInvites':
        setBoardInvites(!boardInvites)
        break
      case 'weeklyDigest':
        setWeeklyDigest(!weeklyDigest)
        break
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="w-6 h-6 text-blue-600" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Email Notifications</h2>
          <p className="text-sm text-gray-600">Manage how you receive email notifications</p>
        </div>
      </div>

      {/* Master Toggle */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-medium text-blue-900">Enable Email Notifications</h3>
              <p className="text-sm text-blue-700">Receive notifications via email</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Notification Types */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">Notification Preferences</h3>
          <p className="text-sm text-gray-600 mt-1">Choose which notifications you want to receive</p>
        </div>

        <div className="divide-y divide-gray-200">
          {NOTIFICATION_TYPES.map((type) => (
            <div key={type.id} className="px-4 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-gray-400" />
                    <h4 className="font-medium text-gray-900">{type.label}</h4>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 ml-6">{type.description}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={getToggleState(type.id)}
                    onChange={() => handleToggle(type.id)}
                    disabled={!emailNotifications}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  )
}
