import { cn } from '@/lib/utils'

interface LoadingSkeletonProps {
  className?: string
  count?: number
  height?: string
}

/**
 * Loading skeleton component for better perceived performance
 * Shows a pulsing placeholder while content loads
 */
export function LoadingSkeleton({ className, count = 1, height = 'h-20' }: LoadingSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'animate-pulse bg-gray-200 rounded-lg',
            height,
            className
          )}
        />
      ))}
    </>
  )
}

/**
 * Line item loading skeleton
 * Mimics the structure of actual line items
 */
export function LineItemSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg"
        >
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-gray-200 rounded animate-pulse w-1/3" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-16" />
              <div className="h-5 bg-gray-200 rounded animate-pulse w-20" />
            </div>
            <div className="text-right space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-16" />
              <div className="h-5 bg-gray-200 rounded animate-pulse w-20" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse" />
              <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Budget card loading skeleton
 */
export function BudgetCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="block bg-white rounded-lg border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="space-y-2">
              <div className="h-5 bg-gray-200 rounded animate-pulse w-48" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
            </div>
            <div className="text-right space-y-2">
              <div className="h-6 bg-gray-200 rounded animate-pulse w-40" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 animate-pulse" />
        </div>
      ))}
    </div>
  )
}

/**
 * Expense card loading skeleton
 */
export function ExpenseCardSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
        >
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-200 rounded-lg animate-pulse w-10 h-10" />
              <div className="space-y-2">
                <div className="h-5 bg-gray-200 rounded animate-pulse w-40" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
              </div>
            </div>
          </div>
          <div className="text-right space-y-2">
            <div className="h-6 bg-gray-200 rounded animate-pulse w-24" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default LoadingSkeleton
