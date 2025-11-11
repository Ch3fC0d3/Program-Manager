import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import Layout from '@/components/Layout'
import Button from '@/components/ui/Button'
import TourGuide from '@/components/TourGuide'
import { Plus, ChevronDown, ChevronRight, Archive, ArchiveRestore } from 'lucide-react'
import toast from 'react-hot-toast'
import { Step } from 'react-joyride'

export default function BoardsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [showArchived, setShowArchived] = useState(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const { data: boards, isLoading } = useQuery({
    queryKey: ['boards'],
    queryFn: async () => {
      const { data } = await axios.get('/api/boards')
      return data
    },
    enabled: !!session
  })

  const archiveBoardMutation = useMutation({
    mutationFn: async ({ id, archive }: { id: string; archive: boolean }) => {
      if (archive) {
        await axios.post(`/api/boards/${id}/archive`)
      } else {
        await axios.delete(`/api/boards/${id}/archive`)
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['boards'] })
      toast.success(variables.archive ? 'Board archived' : 'Board unarchived')
    },
    onError: () => {
      toast.error('Failed to update board')
    }
  })

  const handleCardClick = (board: any) => {
    router.push(`/boards/${board.id}`)
  }

  const handleArchiveToggle = (e: React.MouseEvent, board: any, archive: boolean) => {
    e.stopPropagation()
    archiveBoardMutation.mutate({ id: board.id, archive })
  }

  // Separate active and archived boards
  const activeBoards = boards?.filter((b: any) => !b.archivedAt) || []
  const archivedBoards = boards?.filter((b: any) => b.archivedAt) || []

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  const boardsTourSteps: Step[] = [
    {
      target: '[data-tour-id="boards-title"]',
      title: 'Welcome to Boards! 📋',
      content: 'Boards help you organize your projects. Each board can contain multiple tasks and team members.',
      disableBeacon: true,
    },
    {
      target: '[data-tour-id="new-board-btn"]',
      title: 'Create a New Board',
      content: 'Click here to create a new board for your project. You can add a name, description, and team members.',
    },
    {
      target: '[data-tour-id="active-boards"]',
      title: 'Active Boards',
      content: 'These are your active boards. Click on any board to view its tasks and details.',
    },
    {
      target: '[data-tour-id="archived-toggle"]',
      title: 'Archived Boards',
      content: 'View or restore archived boards here. Archiving helps keep your workspace clean.',
    },
  ]

  return (
    <Layout>
      <TourGuide storageKey="tour_boards_seen" steps={boardsTourSteps} />
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900" data-tour-id="boards-title">My Boards</h1>
          <Button onClick={() => router.push('/boards/new')} data-tour-id="new-board-btn">
            <Plus size={20} className="mr-2" />
            New Board
          </Button>
        </div>

        {/* Active Boards */}
        {activeBoards.length > 0 ? (
          <div className="mb-8" data-tour-id="active-boards">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Active Boards</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeBoards.map((board: any) => (
                <div
                  key={board.id}
                  onClick={() => handleCardClick(board)}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {board.name}
                      </h3>
                      {board.description && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {board.description}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleArchiveToggle(e, board, true)}
                      disabled={archiveBoardMutation.isPending}
                    >
                      <Archive size={16} className="mr-2" /> Archive
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500">
                    {board._count?.tasks || 0} tasks
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 mb-8">
            <p className="text-gray-500 mb-4">No active boards yet</p>
            <Button onClick={() => router.push('/boards/new')}>
              <Plus size={20} className="mr-2" />
              Create Your First Board
            </Button>
          </div>
        )}

        {/* Archived Boards - Collapsible */}
        {archivedBoards.length > 0 && (
          <div className="border-t pt-6">
            <button
              onClick={() => setShowArchived(!showArchived)}
              data-tour-id="archived-toggle"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              {showArchived ? (
                <ChevronDown size={20} />
              ) : (
                <ChevronRight size={20} />
              )}
              <Archive size={18} />
              <span className="font-medium">
                Archived Boards ({archivedBoards.length})
              </span>
            </button>

            {showArchived && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {archivedBoards.map((board: any) => (
                  <div
                    key={board.id}
                    onClick={() => handleCardClick(board)}
                    className="bg-gray-50 rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer opacity-75 hover:opacity-100"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-700">
                          {board.name}
                        </h3>
                        {board.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {board.description}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleArchiveToggle(e, board, false)}
                        disabled={archiveBoardMutation.isPending}
                      >
                        <ArchiveRestore size={16} className="mr-2" /> Unarchive
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500">
                      {board._count?.tasks || 0} tasks
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
