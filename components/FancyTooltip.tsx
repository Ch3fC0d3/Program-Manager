import { forwardRef } from 'react'
import { TooltipRenderProps } from 'react-joyride'

const FancyTooltip = forwardRef<HTMLDivElement, TooltipRenderProps>(
  function FancyTooltip(
    { continuous, step, backProps, primaryProps, closeProps, index, size },
    ref
  ) {
    return (
      <div
        ref={ref}
        className="max-w-96 rounded-2xl shadow-xl ring-1 ring-black/10 bg-white"
      >
        <div className="px-5 pt-4 pb-3 border-b border-gray-200">
          <div className="text-xs text-gray-500">
            {index + 1} / {size}
          </div>
          {step.title && (
            <h3 className="mt-1 text-base font-semibold text-gray-900">
              {step.title}
            </h3>
          )}
        </div>
        <div className="p-5 text-sm leading-6 text-gray-700">
          {step.content}
        </div>
        <div className="flex items-center justify-between gap-2 px-5 pb-4">
          <button
            {...closeProps}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            Skip Tour
          </button>
          <div className="space-x-2">
            {index > 0 && (
              <button
                {...backProps}
                className="px-3 py-1.5 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            )}
            <button
              {...primaryProps}
              className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              {continuous ? 'Next' : 'Done'}
            </button>
          </div>
        </div>
      </div>
    )
  }
)

export default FancyTooltip
