import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { FileText, Sparkles, Loader2, CheckCircle } from 'lucide-react'
import Button from './ui/Button'
import Select from './ui/Select'
import toast from 'react-hot-toast'

export default function MeetingNotesExtractor() {
  const [notes, setNotes] = useState('')
  const [selectedBoard, setSelectedBoard] = useState('')
  const [extractedTasks, setExtractedTasks] = useState<any[]>([])
  const [meeting, setMeeting] = useState<any>(null)
  const [meetingTitle, setMeetingTitle] = useState('')
  const [meetingDate, setMeetingDate] = useState('')
  const [meetingDuration, setMeetingDuration] = useState('')
  const [meetingLocation, setMeetingLocation] = useState('')
  const [meetingAttendees, setMeetingAttendees] = useState('')
  const queryClient = useQueryClient()

  const { data: boards } = useQuery({
    queryKey: ['boards'],
    queryFn: async () => {
      const { data } = await axios.get('/api/boards')
      return data
    }
  })

  const extractTasks = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post('/api/ai/extract-tasks', {
        content: notes,
        boardId: selectedBoard || boards?.[0]?.id,
        meetingTitle: meetingTitle || undefined,
        meetingDate: meetingDate || undefined,
        meetingDuration: meetingDuration || undefined,
        meetingLocation: meetingLocation || undefined,
        meetingAttendees: meetingAttendees ? meetingAttendees.split(',').map(a => a.trim()) : undefined
      })
      return data
    },
    onSuccess: (data) => {
      setExtractedTasks(data.tasks)
      setMeeting(data.meeting)
      if (data.meeting) {
        toast.success(`Meeting created with ${data.count} action items!`)
        queryClient.invalidateQueries({ queryKey: ['meetings'] })
      } else {
        toast.success(`${data.count} tasks created!`)
      }
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to extract tasks')
    }
  })

  const handleExtract = () => {
    if (!notes.trim()) {
      toast.error('Please enter meeting notes')
      return
    }
    extractTasks.mutate()
  }

  const handleReset = () => {
    setNotes('')
    setExtractedTasks([])
    setMeeting(null)
    setMeetingTitle('')
    setMeetingDate('')
    setMeetingDuration('')
    setMeetingLocation('')
    setMeetingAttendees('')
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-dashed border-purple-300 p-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900">Meeting Notes → Tasks</h3>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        Paste your meeting notes, and AI will automatically extract action items and create tasks.
      </p>

      {extractedTasks.length === 0 ? (
        <>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Paste meeting notes here...

Example:
- John will review the proposal by Friday
- Sarah needs to update the design mockups
- Team should schedule follow-up meeting next week
- Mike to contact vendor about pricing"
            className="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none mb-4"
            disabled={extractTasks.isPending}
          />

          {/* Meeting Details (Optional) */}
          <div className="bg-white rounded-lg p-4 mb-4 space-y-3">
            <p className="text-sm font-medium text-gray-700 mb-2">Meeting Details (Optional)</p>
            
            <input
              type="text"
              placeholder="Meeting Title (e.g., Weekly Team Sync)"
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={extractTasks.isPending}
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                type="datetime-local"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={extractTasks.isPending}
              />
              <input
                type="number"
                placeholder="Duration (min)"
                value={meetingDuration}
                onChange={(e) => setMeetingDuration(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={extractTasks.isPending}
              />
            </div>

            <input
              type="text"
              placeholder="Location (e.g., Conference Room A)"
              value={meetingLocation}
              onChange={(e) => setMeetingLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={extractTasks.isPending}
            />

            <input
              type="text"
              placeholder="Attendees (comma-separated)"
              value={meetingAttendees}
              onChange={(e) => setMeetingAttendees(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={extractTasks.isPending}
            />
          </div>

          <div className="flex items-center gap-3 mb-4">
            <Select
              value={selectedBoard}
              onChange={(e) => setSelectedBoard(e.target.value)}
              className="flex-1"
            >
              <option value="">Default Board</option>
              {boards?.map((board: any) => (
                <option key={board.id} value={board.id}>
                  {board.name}
                </option>
              ))}
            </Select>
          </div>

          <Button
            onClick={handleExtract}
            disabled={extractTasks.isPending || !notes.trim()}
            className="w-full"
          >
            {extractTasks.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Extracting Tasks...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Extract Action Items
              </>
            )}
          </Button>
        </>
      ) : (
        <div className="bg-white rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2 text-green-600 mb-4">
            <CheckCircle className="w-5 h-5" />
            <span className="font-semibold">
              {meeting ? `Meeting created with ${extractedTasks.length} action items!` : `${extractedTasks.length} Tasks Created!`}
            </span>
          </div>

          {meeting && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-purple-900 mb-1">{meeting.title}</p>
              <p className="text-xs text-purple-700">
                Meeting saved • {extractedTasks.length} action items linked
              </p>
            </div>
          )}

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {extractedTasks.map((task: any) => (
              <div key={task.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-medium text-gray-900">{task.title}</h4>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full flex-shrink-0">
                    {task.priority}
                  </span>
                </div>
                {task.description && (
                  <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{task.board.name}</span>
                  {task.assignee && (
                    <>
                      <span>•</span>
                      <span>{task.assignee.name}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleReset}
              className="flex-1"
            >
              Extract More
            </Button>
            {meeting ? (
              <Button
                onClick={() => window.location.href = `/meetings/${meeting.id}`}
                className="flex-1"
              >
                View Meeting
              </Button>
            ) : (
              <Button
                onClick={() => window.location.href = '/tasks'}
                className="flex-1"
              >
                View All Tasks
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
