import * as React from 'react'

import { cn } from '@/lib/utils'

type TableContainerProps = React.ComponentProps<'div'> & {
  maxHeight?: string
}

function TableContainer({
  className,
  maxHeight,
  children,
  ...props
}: TableContainerProps) {
  return (
    <div
      data-slot="table-container"
      className={cn(
        'relative w-full min-w-0 max-w-full overflow-x-auto overflow-y-visible rounded-2xl border border-border bg-card shadow-sm',
        className,
      )}
      style={maxHeight ? { maxHeight } : undefined}
      {...props}
    >
      {children}
    </div>
  )
}

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <table
      data-slot="table"
      className={cn('w-full caption-bottom text-sm', className)}
      {...props}
    />
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        'bg-muted/80 backdrop-blur-sm [&_tr]:border-b [&_tr]:border-border',
        className,
      )}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn(
        '[&_tr:last-child]:border-0 [&_tr:nth-child(even)]:bg-muted/25',
        className,
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'border-b border-border transition-colors duration-150 hover:bg-primary/5 data-[state=selected]:bg-muted',
        className,
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'sticky top-0 z-10 h-12 bg-muted/95 px-4 text-left align-middle text-xs font-semibold tracking-wide text-foreground/70 uppercase backdrop-blur-sm',
        className,
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn('px-4 py-3.5 align-middle', className)}
      {...props}
    />
  )
}

export {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
}
