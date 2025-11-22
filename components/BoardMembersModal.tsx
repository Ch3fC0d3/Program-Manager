import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import Image from 'next/image'
import Modal from './ui/Modal'
import Button from './ui/Button'
import Select from './ui/Select'
import { UserPlus, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface BoardMembersModalProps {
  boardId: string
  isOpen: boolean
  onClose: () => void
}

export default function BoardMembersModal({ boardId, isOpen, onClose }: BoardMembersModalProps) {
  const [selectedUserId, setSelectedUserId] = useState('')
  const queryClient = useQueryClient()

  // Fetch all users
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await axios.get('/api/users')
      return data
    },
    enabled: isOpen
  })

  // Fetch board members
  const { data: members, isLoading } = useQuery({
    queryKey: ['board-members', boardId],
    queryFn: async () => {
      const { data } = await axios.get(`/api/boards/${boardId}/members`)
      return data
    },
    enabled: isOpen && !!boardId
  })

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      await axios.post(`/api/boards/${boardId}/members`, { userId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-members', boardId] })
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      toast.success('Member added successfully')
      setSelectedUserId('')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to add member')
    }
  })

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      await axios.delete(`/api/boards/${boardId}/members`, { data: { userId } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-members', boardId] })
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      toast.success('Member removed successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to remove member')
    }
  })

  const handleAddMember = () => {
    if (!selectedUserId) {
      toast.error('Please select a user')
      return
    }
    addMemberMutation.mutate(selectedUserId)
  }

  const handleRemoveMember = (userId: string) => {
    if (confirm('Are you sure you want to remove this member?')) {
      removeMemberMutation.mutate(userId)
    }
  }

  // Filter out users who are already members
  const availableUsers = users?.filter(
    (user: any) => !members?.some((member: any) => member.userId === user.id)
  ) || []

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Board Members"
      footer={
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Add Member Section */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Add Member</h3>
          <div className="flex gap-2">
            <div className="flex-1">
              <Select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                options={[
                  { value: '', label: 'Select a user...' },
                  ...availableUsers.map((user: any) => ({
                    value: user.id,
                    label: user.name || user.email
                  }))
                ]}
              />
            </div>
            <Button
              onClick={handleAddMember}
              disabled={!selectedUserId || addMemberMutation.isPending}
            >
              <UserPlus size={16} className="mr-2" />
              {addMemberMutation.isPending ? 'Adding...' : 'Add'}
            </Button>
          </div>
        </div>

        {/* Current Members Section */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Current Members ({members?.length || 0})
          </h3>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading members...</div>
          ) : members && members.length > 0 ? (
            <div className="space-y-2">
              {members.map((member: any) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {member.user.avatar ? (
                      <Image
                        src={member.user.avatar}
                        alt={member.user.name}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full"
                        unoptimized
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                        {(member.user.name || member.user.email).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {member.user.name || member.user.email}
                      </p>
                      <p className="text-xs text-gray-500">{member.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 capitalize">
                      {member.role.toLowerCase()}
                    </span>
                    <button
                      onClick={() => handleRemoveMember(member.userId)}
                      disabled={removeMemberMutation.isPending}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Remove member"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No members yet. Add your first member above.
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
