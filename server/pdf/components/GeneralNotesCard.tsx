type GeneralNotesCardProps = {
  html: string
}

export function GeneralNotesCard({ html }: GeneralNotesCardProps) {
  if (!html.trim()) {
    return (
      <p className="report-empty" role="status">
        No general notes.
      </p>
    )
  }

  return (
    <article className="report-general-notes">
      <div
        className="report-general-notes__content"
        dir="auto"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  )
}
