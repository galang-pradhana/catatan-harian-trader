import * as React from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  success?: boolean
  label?: string
  helperText?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, success, label, helperText, id, disabled, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-foreground/80 uppercase tracking-wider"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            type={type}
            id={inputId}
            className={cn(
              'flex h-11 w-full rounded-lg border bg-card px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/50 min-h-[44px]',
              error
                ? 'border-destructive focus-visible:ring-destructive focus-visible:border-destructive'
                : success
                ? 'border-profit focus-visible:ring-profit focus-visible:border-profit pr-10'
                : 'border-border',
              className
            )}
            ref={ref}
            disabled={disabled}
            {...props}
          />
          {success && !error && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-profit pointer-events-none">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          )}
          {error && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive pointer-events-none">
              <AlertCircle className="h-5 w-5" />
            </div>
          )}
        </div>
        {error ? (
          <p className="text-xs text-destructive flex items-center gap-1 font-medium mt-1">
            {error}
          </p>
        ) : helperText ? (
          <p className="text-xs text-muted-foreground mt-1">{helperText}</p>
        ) : null}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
