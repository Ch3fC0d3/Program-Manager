import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-foreground mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-3 py-2 rounded-md shadow-sm transition-colors',
            'border border-border bg-card text-card-foreground placeholder:text-muted-foreground/80',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:ring-offset-2 focus:ring-offset-background',
            'disabled:bg-muted disabled:text-muted-foreground disabled:placeholder:text-muted-foreground/70 disabled:cursor-not-allowed',
            error && 'border-red-500',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
