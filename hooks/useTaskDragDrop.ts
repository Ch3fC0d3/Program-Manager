import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import toast from 'react-hot-toast'

export function useTaskDragDrop(invalidateKeys: string[][] = []) {
  const queryClient = useQueryClient()
  const [draggedTask, setDraggedTask] = useState<string | null>(null)

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status, parentId }: { taskId: string; status?: string; parentId?: string | null }) => {
      const { data } = await axios.put(`/api/tasks/${taskId}`, {
        ...(status && { status }),
        ...(parentId !== undefined && { parentId })
      })
      return data
    },
    onSuccess: (_, variables) => {
      invalidateKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key, exact: false, refetchType: 'active' })
      })

      if (variables?.taskId) {
        queryClient.invalidateQueries({ queryKey: ['task', variables.taskId], exact: false, refetchType: 'active' })
      }

      toast.success('Task updated')
      setDraggedTask(null)
    },
    onError: () => {
      toast.error('Failed to update task')
      setDraggedTask(null)
    }
  })

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId)
  }

  const handleDragEnd = () => {
    setDraggedTask(null)
  }

  const handleDropOnCard = (droppedTaskId: string, targetTaskId: string) => {
    if (!droppedTaskId || droppedTaskId === targetTaskId) {
      return
    }

    setDraggedTask(null)

    updateTaskMutation.mutate({
      taskId: droppedTaskId,
      parentId: targetTaskId
    })
  }

  const handleDropOnColumn = (status: string) => {
    if (draggedTask) {
      const taskId = draggedTask
      setDraggedTask(null)
      updateTaskMutation.mutate({ taskId, status })
    }
  }

  return {
    draggedTask,
    handleDragStart,
    handleDragEnd,
    handleDropOnCard,
    handleDropOnColumn,
    isUpdating: updateTaskMutation.isPending
  }
}
