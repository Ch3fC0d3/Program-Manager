import { useState } from 'react'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Users, Plus, Mail, Calendar, Loader2, Shield, Trash2, Key } from 'lucide-react'
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
  const [showManageBoards, setShowManageBoards] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<RoleValue>('MEMBER')
  const [selectedBoards, setSelectedBoards] = useState<string[]>([])

  // Reset form when modal closes
  const handleCloseModal = () => {
    setShowAddUser(false)
    setName('')
    setEmail('')
    setPassword('')
    setRole('MEMBER')
    setSelectedBoards([])
  }
  const [roleDrafts, setRoleDrafts] = useState<Record<string, RoleValue>>({})
  const [pendingRoleUserId, setPendingRoleUserId] = useState<string | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null)
  const [resetPasswordUserName, setResetPasswordUserName] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const isAdmin = session?.user?.role === 'ADMIN'

  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await axios.get('/api/users')
      return data
    },
    enabled: isAdmin && status === 'authenticated',
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true // Refetch when window regains focus
  })

  const { data: boards } = useQuery({
    queryKey: ['boards'],
    queryFn: async () => {
      const { data } = await axios.get('/api/boards')
      return data
    },
    enabled: isAdmin && status === 'authenticated'
  })

  const createUserMutation = useMutation({
    mutationFn: async (userData: { name: string; email: string; password: string; role: RoleValue; boardIds?: string[] }) => {
      const { data } = await axios.post('/api/users', userData)
      return data
    },
    onSuccess: async () => {
      toast.success('User created successfully! Welcome email sent.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: ['user-activity-log'] })
      ])
      handleCloseModal()
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

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      const { data } = await axios.post('/api/admin/reset-password', { userId, newPassword })
      return data
    },
    onSuccess: () => {
      toast.success('Password reset successfully')
      setShowResetPassword(false)
      setResetPasswordUserId(null)
      setResetPasswordUserName('')
      setNewPassword('')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to reset password')
    }
  })

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await axios.delete('/api/users', {
        data: { userId }
      })
      return userId
    },
    onMutate: async (userId) => {
      setDeletingUserId(userId)
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['users'] })
      
      // Snapshot the previous value
      const previousUsers = queryClient.getQueryData(['users'])
      
      // Optimistically update to remove the user immediately
      queryClient.setQueryData(['users'], (old: any) => {
        if (!old) return old
        return old.filter((user: any) => user.id !== userId)
      })
      
      // Return context with the snapshot
      return { previousUsers }
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
    onError: (error: any, _userId, context: any) => {
      // Rollback on error
      if (context?.previousUsers) {
        queryClient.setQueryData(['users'], context.previousUsers)
      }
      toast.error(error.response?.data?.error || 'Failed to delete user')
    },
    onSettled: () => {
      setDeletingUserId(null)
    }
  })

  const resendWelcomeEmailMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data} = await axios.post('/api/user/resend-welcome-email', { userId })
      return data
    },
    onSuccess: () => {
      toast.success('Welcome email sent successfully!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to send email')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !password) {
      toast.error('All fields are required')
      return
    }
    createUserMutation.mutate({ name, email, password, role, boardIds: selectedBoards })
  }

  const toggleBoard = (boardId: string) => {
    setSelectedBoards(prev =>
      prev.includes(boardId)
        ? prev.filter(id => id !== boardId)
        : [...prev, boardId]
    )
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
                        <div className="text-center px-4 py-2 bg-gray-100 rounded-lg">
                          <span className="text-xs text-gray-600">You cannot modify your own account</span>
                        </div>
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
                            onClick={() => resendWelcomeEmailMutation.mutate(user.id)}
                            disabled={resendWelcomeEmailMutation.isPending}
                            className="flex items-center gap-2"
                            title="Resend welcome email with login link"
                            aria-label={`Resend welcome email to ${user.email}`}
                          >
                            {resendWelcomeEmailMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Sending...</span>
                              </>
                            ) : (
                              <>
                                <Mail className="w-4 h-4" />
                                <span>Resend Email</span>
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setResetPasswordUserId(user.id)
                              setResetPasswordUserName(user.name || user.email)
                              setShowResetPassword(true)
                            }}
                            className="flex items-center gap-2"
                            title="Reset user password"
                          >
                            <Key className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUserId(user.id)
                              setShowManageBoards(true)
                            }}
                            className="flex items-center gap-2"
                          >
                            <Users className="w-4 h-4" />
                            <span>Boards</span>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            disabled={deletingUserId === user.id || pendingRoleUserId === user.id}
                            className="flex items-center gap-2"
                          >
                            {deletingUserId === user.id ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Removing...</span>
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4" />
                                <span>Remove</span>
                              </>
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
        onClose={handleCloseModal}
        title="Add New User"
        footer={
          <>
            <Button variant="outline" onClick={handleCloseModal}>
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
          
          {/* Board Assignment */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Assign to Boards (Optional)
            </label>
            <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-3 space-y-2">
              {boards && boards.length > 0 ? (
                boards.map((board: any) => (
                  <label key={board.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted p-2 rounded">
                    <input
                      type="checkbox"
                      checked={selectedBoards.includes(board.id)}
                      onChange={() => toggleBoard(board.id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-foreground">{board.name}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No boards available</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Select boards to add this user as a member
            </p>
          </div>
        </form>
      </Modal>

      {/* Manage Boards Modal */}
      <Modal
        isOpen={showManageBoards}
        onClose={() => {
          setShowManageBoards(false)
          setSelectedUserId(null)
        }}
        title="Manage Board Memberships"
        footer={
          <Button onClick={() => {
            setShowManageBoards(false)
            setSelectedUserId(null)
            queryClient.invalidateQueries({ queryKey: ['users'] })
          }}>
            Done
          </Button>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add or remove this user from boards
          </p>
          <div className="max-h-96 overflow-y-auto border border-border rounded-lg p-3 space-y-2">
            {boards && boards.length > 0 ? (
              boards.map((board: any) => {
                const selectedUser = users?.find((u: any) => u.id === selectedUserId)
                const isMember = selectedUser?.boards?.some((m: any) => m.boardId === board.id)
                
                return (
                  <div key={board.id} className="flex items-center justify-between p-2 hover:bg-muted rounded">
                    <span className="text-sm text-foreground">{board.name}</span>
                    <Button
                      size="sm"
                      variant={isMember ? "destructive" : "outline"}
                      onClick={async () => {
                        try {
                          if (isMember) {
                            await axios.delete(`/api/boards/${board.id}/members`, {
                              data: { userId: selectedUserId }
                            })
                            toast.success('Removed from board')
                          } else {
                            await axios.post(`/api/boards/${board.id}/members`, {
                              userId: selectedUserId,
                              role: 'MEMBER'
                            })
                            toast.success('Added to board')
                          }
                          queryClient.invalidateQueries({ queryKey: ['users'] })
                        } catch (error: any) {
                          toast.error(error.response?.data?.error || 'Failed to update board membership')
                        }
                      }}
                    >
                      {isMember ? 'Remove' : 'Add'}
                    </Button>
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-muted-foreground">No boards available</p>
            )}
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={showResetPassword}
        onClose={() => {
          setShowResetPassword(false)
          setResetPasswordUserId(null)
          setResetPasswordUserName('')
          setNewPassword('')
        }}
        title={`Reset Password for ${resetPasswordUserName}`}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setShowResetPassword(false)
                setResetPasswordUserId(null)
                setResetPasswordUserName('')
                setNewPassword('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (resetPasswordUserId && newPassword) {
                  resetPasswordMutation.mutate({ userId: resetPasswordUserId, newPassword })
                }
              }}
              disabled={!newPassword || newPassword.length < 6 || resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter a new password for this user. The password must be at least 6 characters long.
          </p>
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password (min 6 characters)"
            required
            minLength={6}
          />
          {newPassword && newPassword.length < 6 && (
            <p className="text-sm text-red-600">Password must be at least 6 characters</p>
          )}
        </div>
      </Modal>
    </div>
  )
}
