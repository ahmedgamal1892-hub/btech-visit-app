import {
  useLayoutEffect,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@/lib/utils'

export type ComboboxDropdownPosition = {
  top: number
  left: number
  width: number
}

export function useComboboxDropdownPosition(
  anchorRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
) {
  const [position, setPosition] = useState<ComboboxDropdownPosition | null>(null)

  useLayoutEffect(() => {
    if (!isOpen) {
      setPosition(null)
      return
    }

    function updatePosition() {
      const anchor = anchorRef.current
      if (!anchor) {
        return
      }

      const rect = anchor.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [anchorRef, isOpen])

  return position
}

type ComboboxDropdownPortalProps = {
  anchorRef: RefObject<HTMLElement | null>
  isOpen: boolean
  listboxRef: RefObject<HTMLUListElement | null>
  id: string
  className?: string
  multiselectable?: boolean
  children: ReactNode
}

export function ComboboxDropdownPortal({
  anchorRef,
  isOpen,
  listboxRef,
  id,
  className,
  multiselectable,
  children,
}: ComboboxDropdownPortalProps) {
  const position = useComboboxDropdownPosition(anchorRef, isOpen)

  if (!isOpen || !position) {
    return null
  }

  return createPortal(
    <ul
      ref={listboxRef}
      id={id}
      role="listbox"
      aria-multiselectable={multiselectable}
      className={cn(
        'fixed z-[200] max-h-[300px] overflow-y-auto rounded-lg border bg-popover py-1 shadow-md',
        className,
      )}
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
      }}
    >
      {children}
    </ul>,
    document.body,
  )
}

export function isComboboxDropdownTarget(
  target: Node,
  containerRef: RefObject<HTMLElement | null>,
  dropdownRef: RefObject<HTMLElement | null>,
) {
  return (
    containerRef.current?.contains(target) ||
    dropdownRef.current?.contains(target)
  )
}

type ComboboxDropdownPanelPortalProps = {
  anchorRef: RefObject<HTMLElement | null>
  isOpen: boolean
  panelRef: RefObject<HTMLDivElement | null>
  id: string
  className?: string
  children: ReactNode
}

export function ComboboxDropdownPanelPortal({
  anchorRef,
  isOpen,
  panelRef,
  id,
  className,
  children,
}: ComboboxDropdownPanelPortalProps) {
  const position = useComboboxDropdownPosition(anchorRef, isOpen)

  if (!isOpen || !position) {
    return null
  }

  return createPortal(
    <div
      ref={panelRef}
      id={id}
      className={cn(
        'fixed z-[200] max-h-[300px] overflow-hidden rounded-lg border bg-popover shadow-md',
        className,
      )}
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
      }}
    >
      {children}
    </div>,
    document.body,
  )
}
