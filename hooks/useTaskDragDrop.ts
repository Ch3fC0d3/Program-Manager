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
    onSuccess: () => {
      // Invalidate all provided query keys
      invalidateKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key })
      })
      toast.success('Task updated')
    },
    onError: () => {
      toast.error('Failed to update task')
    }
  })

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId)
  }

  const handleDragEnd = () => {
    setDraggedTask(null)
  }

  const handleDropOnCard = (droppedTaskId: string, targetTaskId: string) => {
    updateTaskMutation.mutate({ 
      taskId: droppedTaskId, 
      parentId: targetTaskId 
    })
  }

  const handleDropOnColumn = (status: string) => {
    if (draggedTask) {
      updateTaskMutation.mutate({ taskId: draggedTask, status })
      setDraggedTask(null)
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
