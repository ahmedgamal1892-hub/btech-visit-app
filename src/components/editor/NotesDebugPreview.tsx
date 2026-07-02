import { isNotesDebugPreviewEnabled } from '@/lib/debug-flags'

type NotesDebugPreviewProps = {
  html: string
  plainText: string
  label?: string
}

export function NotesDebugPreview({
  html,
  plainText,
  label = 'Notes',
}: NotesDebugPreviewProps) {
  if (!isNotesDebugPreviewEnabled()) {
    return null
  }

  return (
    <div
      className="mt-3 space-y-3 rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 p-3 text-xs"
      data-testid="notes-debug-preview"
    >
      <p className="font-medium text-amber-900 dark:text-amber-200">
        {label} debug preview
      </p>

      <div className="space-y-1">
        <p className="font-medium text-muted-foreground">Editor HTML</p>
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted/50 p-2 font-mono text-[11px] leading-relaxed">
          {html || '(empty)'}
        </pre>
      </div>

      <div className="space-y-1">
        <p className="font-medium text-muted-foreground">Editor Plain Text</p>
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted/50 p-2 font-mono text-[11px] leading-relaxed">
          {plainText || '(empty)'}
        </pre>
      </div>
    </div>
  )
}
