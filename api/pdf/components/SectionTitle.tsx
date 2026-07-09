type SectionIcon = 'performance' | 'inspection' | 'photos'

type SectionTitleProps = {
  title: string
  icon?: SectionIcon
}

export function SectionTitle({ title, icon }: SectionTitleProps) {
  const className = icon
    ? `report-section__title report-section__title--${icon}`
    : 'report-section__title'

  return (
    <h2 className={className}>
      {icon ? <span className="report-section__icon" aria-hidden="true" /> : null}
      <span className="report-section__title-text">{title}</span>
    </h2>
  )
}
