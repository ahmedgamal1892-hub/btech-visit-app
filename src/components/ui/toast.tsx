import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'

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

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((input: Omit<ToastItem, 'id'>) => {
    const id = crypto.randomUUID()
    setToasts((current) => [...current, { ...input, id }])

    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id))
    }, 4000)
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((item) => (
          <div
            key={item.id}
            role="status"
            className={cn(
              'pointer-events-auto rounded-xl border bg-background p-4 shadow-lg',
              item.variant === 'success' && 'border-emerald-200',
              item.variant === 'error' && 'border-destructive/20',
            )}
          >
            <div className="flex items-start gap-3">
              {item.variant === 'success' ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              ) : (
                <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {item.title}
                </p>
                {item.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
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
