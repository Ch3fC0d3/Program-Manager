import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import Layout from '@/components/Layout'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { User, Bell, Shield, Database, Palette, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import UserManagement from '@/components/UserManagement'
import UserActivityLog from '@/components/UserActivityLog'
import NotificationSettings from '@/components/NotificationSettings'
import { ThemeMode, useTheme } from '@/lib/theme/ThemeContext'

export default function SettingsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('profile')
  const { theme: currentTheme, setTheme } = useTheme()

  // Profile settings
  const [name, setName] = useState(session?.user?.name || '')
  const [email, setEmail] = useState(session?.user?.email || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [taskReminders, setTaskReminders] = useState(true)
  const [weeklyDigest, setWeeklyDigest] = useState(false)

  // Appearance settings
  const [theme, setThemeState] = useState<ThemeMode>('light')
  const [language, setLanguage] = useState('en')

  useEffect(() => {
    setThemeState(currentTheme)
  }, [currentTheme])

  const handleThemeChange = (value: string) => {
    const nextTheme = (['light', 'dark', 'disco'] as ThemeMode[]).includes(value as ThemeMode)
      ? (value as ThemeMode)
      : 'light'
    setThemeState(nextTheme)
    setTheme(nextTheme)
  }

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const { data } = await axios.put('/api/user/profile', {
        name,
        email,
      })
      return data
    },
    onSuccess: () => {
      toast.success('Profile updated successfully')
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
    onError: () => {
      toast.error('Failed to update profile')
    },
  })

  const updatePasswordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match')
      }
      const { data } = await axios.put('/api/user/password', {
        currentPassword,
        newPassword,
      })
      return data
    },
    onSuccess: () => {
      toast.success('Password updated successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update password')
    },
  })

  const updateNotificationsMutation = useMutation({
    mutationFn: async () => {
      const { data } = await axios.put('/api/user/notifications', {
        emailNotifications,
        taskReminders,
        weeklyDigest,
      })
      return data
    },
    onSuccess: () => {
      toast.success('Notification preferences updated')
    },
    onError: () => {
      toast.error('Failed to update preferences')
    },
  })

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'data', label: 'Data & Privacy', icon: Database },
  ]

  return (
    <Layout>
      <div className="max-w-6xl mx-auto text-foreground">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account settings and preferences</p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-card rounded-lg border border-border p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <tab.icon size={20} />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-card rounded-lg border border-border p-6">
              {activeTab === 'users' && (
                <div className="space-y-6">
                  <UserManagement />
                  <UserActivityLog />
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Full Name
                        </label>
                        <Input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Enter your name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Email Address
                        </label>
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Role
                        </label>
                        <Input
                          value={session?.user?.role || 'Member'}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                      <Button onClick={() => updateProfileMutation.mutate()}>
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Notification Preferences</h2>
                  <NotificationSettings />
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Change Password</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Current Password
                        </label>
                        <Input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          New Password
                        </label>
                        <Input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Confirm New Password
                        </label>
                        <Input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                        />
                      </div>
                      <Button
                        onClick={() => updatePasswordMutation.mutate()}
                        disabled={!currentPassword || !newPassword || !confirmPassword}
                      >
                        Update Password
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Appearance</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Theme
                        </label>
                        <Select
                          value={theme}
                          onChange={(e) => handleThemeChange(e.target.value)}
                          options={[
                            { value: 'light', label: 'Light' },
                            { value: 'dark', label: 'Dark' },
                            { value: 'disco', label: 'Disco' },
                          ]}
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          Choose between light, dark, or a playful disco mode.
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Language
                        </label>
                        <Select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          options={[
                            { value: 'en', label: 'English' },
                            { value: 'es', label: 'Spanish' },
                            { value: 'fr', label: 'French' },
                          ]}
                        />
                        <p className="text-sm text-gray-500 mt-1">Coming soon</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'data' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Data & Privacy</h2>
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-medium mb-2">Export Your Data</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          Download a copy of all your data including tasks, boards, and contacts.
                        </p>
                        <Button variant="outline">Export Data</Button>
                      </div>
                      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                        <h3 className="font-medium text-red-900 mb-2">Delete Account</h3>
                        <p className="text-sm text-red-700 mb-3">
                          Permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                        <Button variant="destructive">Delete Account</Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
