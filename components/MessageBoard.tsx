import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { MessageSquare, Send, Trash2 } from 'lucide-react'
import Button from './ui/Button'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

interface Message {
  id: string
  content: string
  userId: string
  createdAt: string
  user: {
    id: string
    name: string
    avatar: string | null
  }
}

export default function MessageBoard() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [newMessage, setNewMessage] = useState('')

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages'],
    queryFn: async () => {
      const { data } = await axios.get('/api/messages')
      return data as Message[]
    },
    enabled: !!session
  })

  const postMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data } = await axios.post('/api/messages', { content })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      setNewMessage('')
      toast.success('Message posted!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to post message')
    }
  })

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      await axios.delete(`/api/messages/${messageId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      toast.success('Message deleted')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete message')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    if (newMessage.length > 500) {
      toast.error('Message is too long (max 500 characters)')
      return
    }
    postMessageMutation.mutate(newMessage)
  }

  const canDeleteMessage = (message: Message) => {
    return message.userId === session?.user?.id || session?.user?.role === 'ADMIN'
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900">Team Messages</h2>
      </div>

      {/* Message Form */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Share an update with the team..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={500}
            disabled={postMessageMutation.isPending}
          />
          <Button
            type="submit"
            disabled={!newMessage.trim() || postMessageMutation.isPending}
          >
            {postMessageMutation.isPending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Post
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {newMessage.length}/500 characters
        </p>
      </form>

      {/* Messages List */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No messages yet. Be the first to post!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-shrink-0">
                {message.user.avatar ? (
                  <img
                    src={message.user.avatar}
                    alt={message.user.name}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">
                      {message.user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {message.user.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  {canDeleteMessage(message) && (
                    <button
                      onClick={() => deleteMessageMutation.mutate(message.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      disabled={deleteMessageMutation.isPending}
                      title="Delete message"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-gray-700 text-sm break-words">
                  {message.content}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
