import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import Layout from '@/components/Layout'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { Plus, Calendar, Clock, MapPin, Users, Tag, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function MeetingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all')
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    description: '',
    meetingDate: '',
    duration: '',
    location: '',
    attendees: '',
    tags: '',
    boardId: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['meetings', filter],
    queryFn: async () => {
      const params: any = {}
      if (filter === 'upcoming') params.upcoming = 'true'
      if (filter === 'past') params.past = 'true'
      
      const { data } = await axios.get('/api/meetings', { params })
      return data
    },
    enabled: !!session
  })

  const { data: boards = [] } = useQuery({
    queryKey: ['boards'],
    queryFn: async () => {
      const { data } = await axios.get('/api/boards')
      return data
    },
    enabled: !!session
  })

  const createMeetingMutation = useMutation({
    mutationFn: async (meetingData: typeof newMeeting) => {
      const { data } = await axios.post('/api/meetings', {
        ...meetingData,
        duration: meetingData.duration ? parseInt(meetingData.duration) : null,
        attendees: meetingData.attendees.split(',').map(a => a.trim()).filter(Boolean),
        tags: meetingData.tags.split(',').map(t => t.trim()).filter(Boolean),
        boardId: meetingData.boardId || null
      })
      return data
    },
    onSuccess: () => {
      toast.success('Meeting created successfully')
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
      setShowCreateModal(false)
      setNewMeeting({
        title: '',
        description: '',
        meetingDate: '',
        duration: '',
        location: '',
        attendees: '',
        tags: '',
        boardId: ''
      })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create meeting')
    }
  })

  const handleCreateMeeting = () => {
    if (!newMeeting.title || !newMeeting.meetingDate) {
      toast.error('Title and meeting date are required')
      return
    }
    createMeetingMutation.mutate(newMeeting)
  }

  const filteredMeetings = meetings

  if (status === 'loading' || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Meetings</h1>
            <p className="text-gray-600 mt-1">Manage meeting notes and track action items</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus size={18} className="mr-2" /> New Meeting
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Meetings
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'upcoming'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setFilter('past')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'past'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Past
            </button>
          </div>
        </div>

        {/* Meetings List */}
        {filteredMeetings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">No meetings found</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus size={18} className="mr-2" /> Create Your First Meeting
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMeetings.map((meeting: any) => (
              <div
                key={meeting.id}
                className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/meetings/${meeting.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 text-lg">{meeting.title}</h3>
                  {meeting.board && (
                    <span
                      className="px-2 py-1 text-xs rounded-full"
                      style={{
                        backgroundColor: `${meeting.board.color}20`,
                        color: meeting.board.color
                      }}
                    >
                      {meeting.board.name}
                    </span>
                  )}
                </div>

                {meeting.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{meeting.description}</p>
                )}

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="flex-shrink-0" />
                    <span>{format(new Date(meeting.meetingDate), 'MMM d, yyyy')}</span>
                    <span className="text-gray-400">at</span>
                    <span>{format(new Date(meeting.meetingDate), 'h:mm a')}</span>
                  </div>

                  {meeting.duration && (
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="flex-shrink-0" />
                      <span>{meeting.duration} minutes</span>
                    </div>
                  )}

                  {meeting.location && (
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="flex-shrink-0" />
                      <span className="truncate">{meeting.location}</span>
                    </div>
                  )}

                  {meeting.attendees && meeting.attendees.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Users size={16} className="flex-shrink-0" />
                      <span className="truncate">{meeting.attendees.join(', ')}</span>
                    </div>
                  )}

                  {meeting.tasks && meeting.tasks.length > 0 && (
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="flex-shrink-0" />
                      <span>{meeting.tasks.length} action items</span>
                    </div>
                  )}
                </div>

                {meeting.tags && meeting.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {meeting.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded"
                      >
                        <Tag size={12} />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create Meeting Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create Meeting"
          size="lg"
          footer={
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateMeeting} disabled={createMeetingMutation.isPending}>
                {createMeetingMutation.isPending ? 'Creating...' : 'Create Meeting'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                value={newMeeting.title}
                onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                placeholder="Weekly Team Sync"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={newMeeting.description}
                onChange={(e) => setNewMeeting({ ...newMeeting, description: e.target.value })}
                placeholder="Meeting agenda and topics..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date & Time <span className="text-red-500">*</span>
                </label>
                <Input
                  type="datetime-local"
                  value={newMeeting.meetingDate}
                  onChange={(e) => setNewMeeting({ ...newMeeting, meetingDate: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes)
                </label>
                <Input
                  type="number"
                  value={newMeeting.duration}
                  onChange={(e) => setNewMeeting({ ...newMeeting, duration: e.target.value })}
                  placeholder="60"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <Input
                value={newMeeting.location}
                onChange={(e) => setNewMeeting({ ...newMeeting, location: e.target.value })}
                placeholder="Conference Room A or Zoom link"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Attendees (comma-separated)
              </label>
              <Input
                value={newMeeting.attendees}
                onChange={(e) => setNewMeeting({ ...newMeeting, attendees: e.target.value })}
                placeholder="john@example.com, jane@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags (comma-separated)
              </label>
              <Input
                value={newMeeting.tags}
                onChange={(e) => setNewMeeting({ ...newMeeting, tags: e.target.value })}
                placeholder="planning, sprint, review"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Board (optional)</label>
              <Select
                value={newMeeting.boardId}
                onChange={(e) => setNewMeeting({ ...newMeeting, boardId: e.target.value })}
              >
                <option value="">No board</option>
                {boards.map((board: any) => (
                  <option key={board.id} value={board.id}>
                    {board.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  )
}
