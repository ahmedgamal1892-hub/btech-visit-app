import { Check, ChevronsUpDown } from 'lucide-react'
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export type SearchableComboboxOption = {
  value: string
  label: string
}

type SearchableComboboxProps = {
  id?: string
  options: SearchableComboboxOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  emptyMessage?: string
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

export function SearchableCombobox({
  id,
  options,
  value,
  onChange,
  placeholder = 'Search...',
  disabled = false,
  emptyMessage = 'No results found',
  'aria-label': ariaLabel,
}: SearchableComboboxProps) {
  const listboxId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const selectedOption = options.find((option) => option.value === value)

  const filteredOptions = useMemo(
    () => filterOptions(options, query),
    [options, query],
  )

  const displayValue = isOpen ? query : (selectedOption?.label ?? '')

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  function openList() {
    if (disabled) {
      return
    }

    setIsOpen(true)
    setQuery('')
    setHighlightedIndex(0)
  }

  function selectOption(option: SearchableComboboxOption) {
    onChange(option.value)
    setQuery('')
    setIsOpen(false)
    inputRef.current?.blur()
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
        selectOption(option)
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
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
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
          value={displayValue}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          onFocus={openList}
          onClick={openList}
          onChange={(event) => {
            setQuery(event.target.value)
            setHighlightedIndex(0)
            setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          className="pr-10"
        />
        <ChevronsUpDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>

      {isOpen && !disabled ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-popover py-1 shadow-md"
        >
          {filteredOptions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              {emptyMessage}
            </li>
          ) : (
            filteredOptions.map((option, index) => {
              const isSelected = option.value === value
              const isHighlighted = index === highlightedIndex

              return (
                <li
                  key={option.value}
                  id={`${listboxId}-option-${option.value}`}
                  role="option"
                  aria-selected={isSelected}
                  className={cn(
                    'flex cursor-pointer items-center justify-between px-3 py-2 text-sm',
                    isHighlighted && 'bg-accent text-accent-foreground',
                    isSelected && !isHighlighted && 'font-medium',
                  )}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectOption(option)}
                >
                  <span>{option.label}</span>
                  {isSelected ? <Check className="size-4 shrink-0" /> : null}
                </li>
              )
            })
          )}
        </ul>
      ) : null}
    </div>
  )
}
