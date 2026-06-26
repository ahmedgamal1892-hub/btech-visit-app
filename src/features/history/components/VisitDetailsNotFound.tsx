import { FileQuestion } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'

export function VisitDetailsNotFound() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 px-6 py-20 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <FileQuestion className="size-8" aria-hidden="true" />
      </div>
      <h2 className="mt-6 text-xl font-semibold text-foreground">
        Visit not found
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        This visit may have been removed, or you may not have permission to view
        it.
      </p>
      <Button type="button" variant="outline" className="mt-6" asChild>
        <Link to="/visit-history">Back to Visit History</Link>
      </Button>
    </div>
  )
}
