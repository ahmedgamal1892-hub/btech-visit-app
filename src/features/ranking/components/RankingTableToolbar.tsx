import { Copy, Download, MoreHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type RankingTableToolbarProps = {
  onExport: () => void
  onCopy: () => void
  disabled?: boolean
}

export function RankingTableToolbar({
  onExport,
  onCopy,
  disabled = false,
}: RankingTableToolbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  return (
    <div className="flex w-full min-w-0 max-w-full flex-nowrap items-center justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={onExport}
        className="h-8 shrink-0 px-2.5 text-xs md:h-9 md:px-3 md:text-sm"
      >
        <Download className="size-3.5 md:size-4" aria-hidden="true" />
        <span className="truncate">Export</span>
      </Button>

      <div ref={menuRef} className="relative shrink-0">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={disabled}
          aria-label="More actions"
          aria-expanded={menuOpen}
          className="size-8 md:size-8"
          onClick={() => setMenuOpen((current) => !current)}
        >
          <MoreHorizontal className="size-3.5 md:size-4" aria-hidden="true" />
        </Button>

        {menuOpen ? (
          <div
            className={cn(
              'absolute top-full right-0 z-20 mt-1 w-max max-w-[min(100vw-2rem,12rem)] overflow-hidden rounded-xl border border-border bg-popover py-1 shadow-md',
            )}
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted"
              onClick={() => {
                onCopy()
                setMenuOpen(false)
              }}
            >
              <Copy className="size-4" aria-hidden="true" />
              Copy table
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
