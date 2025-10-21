import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Users, Plus, Mail, Calendar, Loader2 } from 'lucide-react'
import Button from './ui/Button'
import Input from './ui/Input'
import Modal from './ui/Modal'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/utils'

export default function UserManagement() {
  const [showAddUser, setShowAddUser] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const queryClient = useQueryClient()

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await axios.get('/api/users')
      return data
    }
  })

  const createUserMutation = useMutation({
    mutationFn: async (userData: { name: string; email: string; password: string }) => {
      const { data } = await axios.post('/api/users', userData)
      return data
    },
    onSuccess: () => {
      toast.success('User created successfully!')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['user-activity-log'] })
      setShowAddUser(false)
      setName('')
      setEmail('')
      setPassword('')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create user')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !password) {
      toast.error('All fields are required')
      return
    }
    createUserMutation.mutate({ name, email, password })
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
      ) : (
        <div className="space-y-3">
          {users?.map((user: any) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h4 className="font-medium text-gray-900">{user.name}</h4>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {user.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Joined {formatDate(user.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="text-center">
                  <div className="font-semibold text-gray-900">{user._count?.tasksCreated || 0}</div>
                  <div className="text-xs">Created</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-900">{user._count?.tasksAssigned || 0}</div>
                  <div className="text-xs">Assigned</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-900">{user._count?.boards || 0}</div>
                  <div className="text-xs">Boards</div>
                </div>
              </div>
            </div>
          ))}
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
        </form>
      </Modal>
    </div>
  )
}
