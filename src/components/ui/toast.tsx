import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { AlertCircle, CheckCircle2, XIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

type ToastVariant = 'success' | 'error'

type ToastItem = {
  id: string
  title: string
  description?: string
  variant: ToastVariant
}

type ToastContextValue = {
  toast: (input: Omit<ToastItem, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

type ToastProviderProps = {
  children: ReactNode
}

const variantStyles: Record<
  ToastVariant,
  { container: string; icon: string; Icon: typeof CheckCircle2 }
> = {
  success: {
    container: 'border-success/25 bg-card',
    icon: 'text-success',
    Icon: CheckCircle2,
  },
  error: {
    container: 'border-destructive/25 bg-card',
    icon: 'text-destructive',
    Icon: AlertCircle,
  },
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id))
  }, [])

  const toast = useCallback(
    (input: Omit<ToastItem, 'id'>) => {
      const id = crypto.randomUUID()
      setToasts((current) => [...current, { ...input, id }])

      window.setTimeout(() => {
        dismissToast(id)
      }, 4500)
    },
    [dismissToast],
  )

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-full max-w-sm flex-col gap-3 sm:right-6 sm:bottom-6">
        {toasts.map((item) => {
          const styles = variantStyles[item.variant]
          const Icon = styles.Icon

          return (
            <div
              key={item.id}
              role="status"
              className={cn(
                'pointer-events-auto animate-in slide-in-from-right-4 fade-in-0 rounded-xl border p-4 shadow-lg duration-300',
                styles.container,
              )}
            >
              <div className="flex items-start gap-3">
                <Icon
                  className={cn('mt-0.5 size-5 shrink-0', styles.icon)}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {item.title}
                  </p>
                  {item.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={() => dismissToast(item.id)}
                  aria-label="Dismiss notification"
                >
                  <XIcon className="size-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used within ToastProvider.')
  }

  return context
}
