import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import axios from 'axios'
import { useMutation, useQuery } from '@tanstack/react-query'
import Layout from '@/components/Layout'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Select from '@/components/ui/Select'
import { Palette, Users, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

type Option = { value: string; label: string }

const colorOptions: Option[] = [
  { value: '#3b82f6', label: 'Blue' },
  { value: '#10b981', label: 'Green' },
  { value: '#f97316', label: 'Orange' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ef4444', label: 'Red' },
  { value: '#0ea5e9', label: 'Sky' }
]

const iconOptions: Option[] = [
  { value: '📋', label: 'Clipboard' },
  { value: '📊', label: 'Analytics' },
  { value: '🛠️', label: 'Tools' },
  { value: '🧪', label: 'Lab' },
  { value: '🌐', label: 'Network' },
  { value: '🤝', label: 'Collaboration' }
]

export default function NewBoardPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [icon, setIcon] = useState('📋')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await axios.get('/api/users')
      return data
    },
    enabled: !!session
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const createBoardMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        icon
      }

      if (selectedMembers.length > 0) {
        payload.members = selectedMembers.map((id) => ({ userId: id }))
      }

      const { data } = await axios.post('/api/boards', payload)
      return data
    },
    onSuccess: (board) => {
      toast.success('Board created')
      router.push(`/boards/${board.id}`)
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Failed to create board'
      toast.error(message)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Board name is required')
      return
    }
    createBoardMutation.mutate()
  }

  const memberOptions: Option[] = useMemo(() => (
    (users || [])
      .filter((user: any) => user.id !== session?.user?.id) // Exclude current user
      .map((user: any) => ({
        value: user.id,
        label: user.name || user.email
      }))
  ), [users, session?.user?.id])

  const availableMemberOptions: Option[] = useMemo(() => (
    memberOptions.filter((option) => !selectedMembers.includes(option.value))
  ), [memberOptions, selectedMembers])

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8">
        <button
          onClick={() => router.push('/boards')}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={16} className="mr-1" /> Back to Boards
        </button>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Create a new board</h1>
          <p className="text-sm text-gray-500 mb-6">
            Organize projects, teams, or initiatives in separate workspaces. You can invite collaborators later.
          </p>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Board Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Water & Helium Operations"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Description (optional)</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the purpose of this board and any key details."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Palette size={16} /> Board Color
                </label>
                <Select
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  options={colorOptions}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Icon</label>
                <Select
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  options={iconOptions}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <Users size={16} /> Add Members (optional)
              </label>
              <Select
                value=""
                onChange={(e) => {
                  const value = e.target.value
                  if (!value) return
                  setSelectedMembers((prev) =>
                    prev.includes(value) ? prev : [...prev, value]
                  )
                }}
                options={[
                  { value: '', label: availableMemberOptions.length > 0 ? 'Select member to add' : 'No more members to add' },
                  ...availableMemberOptions
                ]}
                disabled={availableMemberOptions.length === 0}
              />

              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedMembers.map((id) => {
                    const user = memberOptions.find((m) => m.value === id)
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                      >
                        {user?.label || 'Unknown'}
                        <button
                          type="button"
                          className="text-gray-400 hover:text-gray-600"
                          onClick={() => setSelectedMembers((prev) => prev.filter((memberId) => memberId !== id))}
                        >
                          ×
                        </button>
                      </span>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="pt-4 flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.push('/boards')}>
                Cancel
              </Button>
              <Button type="submit" disabled={createBoardMutation.isPending}>
                {createBoardMutation.isPending ? 'Creating...' : 'Create Board'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}
