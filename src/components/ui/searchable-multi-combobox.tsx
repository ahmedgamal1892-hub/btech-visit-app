import { Check, ChevronsUpDown, X } from 'lucide-react'
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'

import {
  ComboboxDropdownPortal,
  isComboboxDropdownTarget,
} from '@/components/ui/combobox-dropdown-portal'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

import type { SearchableComboboxOption } from './searchable-combobox'

type SearchableMultiComboboxProps = {
  id?: string
  options: SearchableComboboxOption[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  disabled?: boolean
  clearable?: boolean
  showCheckboxes?: boolean
  emptyMessage?: string
  className?: string
  'aria-label'?: string
}

function filterOptions(
  options: SearchableComboboxOption[],
  query: string,
): SearchableComboboxOption[] {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return options
  }

  return options.filter((option) =>
    option.label.toLowerCase().includes(normalizedQuery),
  )
}

export function SearchableMultiCombobox({
  id,
  options,
  value,
  onChange,
  placeholder = 'Search...',
  disabled = false,
  clearable = false,
  showCheckboxes = false,
  emptyMessage = 'No results found',
  className,
  'aria-label': ariaLabel,
}: SearchableMultiComboboxProps) {
  const listboxId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const listboxRef = useRef<HTMLUListElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const selectedOptions = useMemo(
    () =>
      value
        .map((selectedValue) =>
          options.find((option) => option.value === selectedValue),
        )
        .filter((option): option is SearchableComboboxOption => Boolean(option)),
    [options, value],
  )

  const filteredOptions = useMemo(
    () => filterOptions(options, query),
    [options, query],
  )

  const showClearAll = clearable && !disabled && value.length > 0

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        isComboboxDropdownTarget(
          event.target as Node,
          containerRef,
          listboxRef,
        )
      ) {
        return
      }

      setIsOpen(false)
      setQuery('')
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  function openList() {
    if (disabled) {
      return
    }

    setIsOpen(true)
    setHighlightedIndex(0)
  }

  function toggleOption(option: SearchableComboboxOption) {
    const isSelected = value.includes(option.value)

    onChange(
      isSelected
        ? value.filter((selectedValue) => selectedValue !== option.value)
        : [...value, option.value],
    )
    setQuery('')
    setHighlightedIndex(0)
    inputRef.current?.focus()
  }

  function removeValue(optionValue: string) {
    onChange(value.filter((selectedValue) => selectedValue !== optionValue))
    inputRef.current?.focus()
  }

  function clearAll() {
    onChange([])
    setQuery('')
    inputRef.current?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (disabled) {
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!isOpen) {
        openList()
        return
      }

      setHighlightedIndex((current) =>
        Math.min(current + 1, Math.max(filteredOptions.length - 1, 0)),
      )
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (!isOpen) {
        openList()
        return
      }

      setHighlightedIndex((current) => Math.max(current - 1, 0))
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      if (!isOpen) {
        openList()
        return
      }

      const option = filteredOptions[highlightedIndex]
      if (option) {
        toggleOption(option)
      }
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setIsOpen(false)
      setQuery('')
    }
  }

  return (
    <div ref={containerRef} className={cn('relative w-full min-w-0 max-w-full', className)}>
      <div
        ref={anchorRef}
        className={cn(
          'flex min-h-10 w-full min-w-0 max-w-full flex-wrap items-center gap-1 rounded-lg border border-input bg-background px-2 py-1.5 text-sm shadow-sm transition-colors',
          'focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30',
          disabled && 'cursor-not-allowed opacity-50',
        )}
        onMouseDown={(event) => {
          if (disabled) {
            return
          }

          if (event.target === inputRef.current) {
            return
          }

          event.preventDefault()
          inputRef.current?.focus()
          openList()
        }}
      >
        {selectedOptions.map((option) => (
          <span
            key={option.value}
            className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
          >
            <span className="max-w-[8rem] truncate sm:max-w-[12rem]">{option.label}</span>
            {!disabled ? (
              <button
                type="button"
                className="rounded-sm text-primary/70 transition-colors hover:text-primary"
                aria-label={`Remove ${option.label}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => removeValue(option.value)}
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            ) : null}
          </span>
        ))}

        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            isOpen && filteredOptions[highlightedIndex]
              ? `${listboxId}-option-${filteredOptions[highlightedIndex].value}`
              : undefined
          }
          value={query}
          placeholder={selectedOptions.length === 0 ? placeholder : undefined}
          disabled={disabled}
          autoComplete="off"
          className={cn(
            'min-w-0 flex-1 basis-0 border-0 bg-transparent px-1 py-1 outline-none placeholder:text-muted-foreground sm:min-w-[5rem]',
            disabled && 'cursor-not-allowed',
          )}
          onFocus={openList}
          onChange={(event) => {
            setQuery(event.target.value)
            setHighlightedIndex(0)
            setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
        />

        {showClearAll ? (
          <button
            type="button"
            className="rounded-sm text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Clear all selections"
            onMouseDown={(event) => event.preventDefault()}
            onClick={clearAll}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}

        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </div>

      <ComboboxDropdownPortal
        anchorRef={anchorRef}
        isOpen={isOpen && !disabled}
        listboxRef={listboxRef}
        id={listboxId}
        multiselectable
      >
        {filteredOptions.length === 0 ? (
          <li className="px-3 py-2 text-sm text-muted-foreground">
            {emptyMessage}
          </li>
        ) : (
          filteredOptions.map((option, index) => {
            const isSelected = value.includes(option.value)
            const isHighlighted = index === highlightedIndex

            return (
              <li
                key={option.value}
                id={`${listboxId}-option-${option.value}`}
                role="option"
                aria-selected={isSelected}
                className={cn(
                  'flex items-center px-3 py-2 text-sm',
                  showCheckboxes ? 'gap-2' : 'cursor-pointer justify-between',
                  isHighlighted && 'bg-accent text-accent-foreground',
                  isSelected && !isHighlighted && 'font-medium',
                )}
                onMouseEnter={() => setHighlightedIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={showCheckboxes ? undefined : () => toggleOption(option)}
              >
                {showCheckboxes ? (
                  <>
                    <Checkbox
                      checked={isSelected}
                      aria-label={`Select ${option.label}`}
                      onCheckedChange={() => toggleOption(option)}
                    />
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate text-left"
                      onClick={() => toggleOption(option)}
                    >
                      {option.label}
                    </button>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 truncate">{option.label}</span>
                    {isSelected ? <Check className="size-4 shrink-0" /> : null}
                  </>
                )}
              </li>
            )
          })
        )}
      </ComboboxDropdownPortal>
    </div>
  )
}
