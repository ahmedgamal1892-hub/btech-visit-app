import * as React from 'react'
import { Tabs as TabsPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex flex-col gap-6', className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'inline-flex h-auto w-full flex-wrap gap-1 rounded-xl bg-muted/60 p-1 lg:flex-col lg:items-stretch',
        className,
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-all',
        'text-muted-foreground hover:bg-background/70 hover:text-foreground',
        'focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:outline-none',
        'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        'animate-in fade-in-0 slide-in-from-bottom-1 space-y-6 duration-300 focus-visible:outline-none',
        className,
      )}
      {...props}
    />
  )
}

export { Tabs, TabsContent, TabsList, TabsTrigger }
