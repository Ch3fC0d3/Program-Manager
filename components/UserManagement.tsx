import { useState } from 'react'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Users, Plus, Mail, Calendar, Loader2, Shield, Trash2 } from 'lucide-react'
import Button from './ui/Button'
import Input from './ui/Input'
import Modal from './ui/Modal'
import Select from './ui/Select'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/utils'

export default function UserManagement() {
  const queryClient = useQueryClient()
  const { data: session, status } = useSession()

  const ROLE_OPTIONS = [
    { value: 'ADMIN', label: 'Admin' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'MEMBER', label: 'Member' },
    { value: 'VIEWER', label: 'Viewer' }
  ] as const

  type RoleValue = (typeof ROLE_OPTIONS)[number]['value']

  const roleLabels: Record<RoleValue, string> = {
    ADMIN: 'Admin',
    MANAGER: 'Manager',
    MEMBER: 'Member',
    VIEWER: 'Viewer'
  }

  const roleClasses: Record<RoleValue, string> = {
    ADMIN: 'bg-red-100 text-red-700',
    MANAGER: 'bg-blue-100 text-blue-700',
    MEMBER: 'bg-green-100 text-green-700',
    VIEWER: 'bg-gray-200 text-gray-700'
  }

  const [showAddUser, setShowAddUser] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<RoleValue>('MEMBER')
  const [roleDrafts, setRoleDrafts] = useState<Record<string, RoleValue>>({})
  const [pendingRoleUserId, setPendingRoleUserId] = useState<string | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)

  const isAdmin = session?.user?.role === 'ADMIN'

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await axios.get('/api/users')
      return data
    },
    enabled: isAdmin && status === 'authenticated'
  })

  const createUserMutation = useMutation({
    mutationFn: async (userData: { name: string; email: string; password: string; role: RoleValue }) => {
      const { data } = await axios.post('/api/users', userData)
      return data
    },
    onSuccess: async () => {
      toast.success('User created successfully!')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: ['user-activity-log'] })
      ])
      setShowAddUser(false)
      setName('')
      setEmail('')
      setPassword('')
      setRole('MEMBER')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create user')
    }
  })

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: RoleValue }) => {
      const { data } = await axios.patch('/api/users', { userId, role })
      return data
    },
    onMutate: ({ userId }) => {
      setPendingRoleUserId(userId)
    },
    onSuccess: async (data, variables) => {
      const updatedRole = (data?.role as RoleValue) || 'MEMBER'
      toast.success(`Role updated to ${roleLabels[updatedRole] || data?.role}`)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: ['user-activity-log'] })
      ])
      if (variables?.userId) {
        setRoleDrafts((prev) => {
          const updated = { ...prev }
          delete updated[variables.userId]
          return updated
        })
      }
    },
    onError: (error: any, variables) => {
      toast.error(error.response?.data?.error || 'Failed to update role')
      if (variables?.userId) {
        setRoleDrafts((prev) => {
          const updated = { ...prev }
          delete updated[variables.userId]
          return updated
        })
      }
    },
    onSettled: () => {
      setPendingRoleUserId(null)
    }
  })

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await axios.delete('/api/users', {
        data: { userId }
      })
      return userId
    },
    onMutate: (userId) => {
      setDeletingUserId(userId)
    },
    onSuccess: async (_data, userId) => {
      toast.success('User removed')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: ['user-activity-log'] })
      ])
      setRoleDrafts((prev) => {
        const updated = { ...prev }
        if (userId) {
          delete updated[userId]
        }
        return updated
      })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete user')
    },
    onSettled: () => {
      setDeletingUserId(null)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !password) {
      toast.error('All fields are required')
      return
    }
    createUserMutation.mutate({ name, email, password, role })
  }

  const handleRoleChange = (userId: string, nextRole: string, currentRole: RoleValue) => {
    const matchedRole = ROLE_OPTIONS.find((option) => option.value === nextRole)?.value
    if (!matchedRole) {
      toast.error('Invalid role selection')
      return
    }

    if (matchedRole === currentRole) {
      return
    }

    setRoleDrafts((prev) => ({ ...prev, [userId]: matchedRole }))
    updateRoleMutation.mutate({ userId, role: matchedRole })
  }

  const handleDeleteUser = (userId: string, userName: string) => {
    const confirmed = window.confirm(`Remove ${userName}? This action cannot be undone.`)
    if (!confirmed) {
      return
    }
    deleteUserMutation.mutate(userId)
  }

  if (status === 'loading') {
    return (
      <div className="bg-card rounded-lg border border-border p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="bg-card rounded-lg border border-border p-6 text-center">
        <Shield className="w-8 h-8 mx-auto text-muted-foreground" />
        <h3 className="mt-3 text-lg font-semibold text-foreground">Admin access required</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          You need admin permissions to view and manage users.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
        </div>
        <Button onClick={() => setShowAddUser(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : users && users.length > 0 ? (
        <div className="space-y-3">
          {users.map((user: any) => {
            const currentRole = (roleDrafts[user.id] ?? user.role) as RoleValue
            const isSelf = user.id === session?.user?.id

            return (
              <div
                key={user.id}
                className="p-4 bg-card border border-border rounded-lg shadow-sm"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {user.avatar ? (
                      <Image
                        src={user.avatar}
                        alt={user.name}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-semibold">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="font-medium text-foreground truncate">{user.name}</h4>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1 min-w-0">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{user.email}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Joined {formatDate(user.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${roleClasses[currentRole]}`}>
                          {roleLabels[currentRole]}
                        </span>
                        {isSelf && (
                          <span className="text-xs text-muted-foreground">(You)</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground justify-between md:justify-end">
                      <div className="text-center">
                        <div className="font-semibold text-foreground">{user._count?.tasksCreated || 0}</div>
                        <div className="text-xs uppercase tracking-wide">Created</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-foreground">{user._count?.tasksAssigned || 0}</div>
                        <div className="text-xs uppercase tracking-wide">Assigned</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-foreground">{user._count?.boards || 0}</div>
                        <div className="text-xs uppercase tracking-wide">Boards</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 md:justify-end">
                      {isSelf ? (
                        <span className="text-xs text-muted-foreground">Your role cannot be modified here.</span>
                      ) : (
                        <>
                          <Select
                            className="min-w-[150px]"
                            value={currentRole}
                            onChange={(e) => handleRoleChange(user.id, e.target.value, currentRole)}
                            disabled={pendingRoleUserId === user.id || deletingUserId === user.id}
                            aria-label={`Update role for ${user.name}`}
                            options={ROLE_OPTIONS as unknown as { value: string; label: string }[]}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            disabled={deletingUserId === user.id || pendingRoleUserId === user.id}
                          >
                            {deletingUserId === user.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <div className="flex items-center gap-2">
                                <Trash2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Remove</span>
                              </div>
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <Users className="w-10 h-10 mx-auto mb-3 text-gray-400" />
          <p>No users found.</p>
        </div>
      )}

      {/* Add User Modal */}
      <Modal
        isOpen={showAddUser}
        onClose={() => setShowAddUser(false)}
        title="Add New User"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAddUser(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createUserMutation.isPending}
            >
              {createUserMutation.isPending ? 'Creating...' : 'Create User'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter full name"
            required
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            required
          />
          <Select
            label="Role"
            value={role}
            onChange={(e) => setRole((e.target.value as RoleValue) || 'MEMBER')}
            options={ROLE_OPTIONS as unknown as { value: string; label: string }[]}
          />
        </form>
      </Modal>
    </div>
  )
}
