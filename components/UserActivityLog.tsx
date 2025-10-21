import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Activity, Loader2, UserPlus } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

export default function UserActivityLog() {
  const { data: activityLog, isLoading } = useQuery({
    queryKey: ['user-activity-log'],
    queryFn: async () => {
      const { data } = await axios.get('/api/users/activity-log')
      return data
    }
  })

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'user_created':
        return <UserPlus className="w-4 h-4 text-green-600" />
      default:
        return <Activity className="w-4 h-4 text-gray-600" />
    }
  }

  const getActionText = (log: any) => {
    switch (log.action) {
      case 'user_created':
        return (
          <>
            <span className="font-medium">{log.user.name}</span> created user{' '}
            <span className="font-medium">{log.details?.createdUserName}</span>
            {' '}({log.details?.createdUserEmail})
          </>
        )
      default:
        return (
          <>
            <span className="font-medium">{log.user.name}</span> performed action: {log.action}
          </>
        )
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Activity className="w-5 h-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900">Activity Log</h3>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : activityLog && activityLog.length > 0 ? (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {activityLog.map((log: any) => (
            <div
              key={log.id}
              className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex-shrink-0 mt-0.5">
                {getActionIcon(log.action)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  {getActionText(log)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDateTime(log.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Activity className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>No activity yet</p>
        </div>
      )}
    </div>
  )
}
