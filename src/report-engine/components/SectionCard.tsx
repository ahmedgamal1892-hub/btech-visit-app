import type { ReactNode } from 'react'

import { SectionTitle } from './SectionTitle'

type SectionIcon = 'performance' | 'inspection' | 'photos'

type SectionCardProps = {
  title: string
  icon?: SectionIcon
  children: ReactNode
  className?: string
}

export function SectionCard({
  title,
  icon,
  children,
  className,
}: SectionCardProps) {
  return (
    <section
      className={className ? `report-section ${className}` : 'report-section'}
    >
      <SectionTitle title={title} icon={icon} />
      <div className="report-section__body">{children}</div>
    </section>
  )
}
