import {
  BarChart3,
  Camera,
  ClipboardList,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  APP_NAME,
  APP_TAGLINE,
  LOGO_ALT,
  LOGO_PATH,
  PDF_BRANDING,
} from '@/lib/constants/branding'
import { cn } from '@/lib/utils'
import type { VisitDetails } from '@/types/visit-details'
import { getAchievementBadgeClassName } from '@/utils/achievement-badge'
import {
  formatAchievementPercent,
  formatNumberWithSeparators,
  formatPdfDate,
  formatPdfDateTime,
  formatPdfTime,
} from '@/utils/format'
import {
  getVisitStatusBadgeProps,
  resolveVisitBadgeDisplay,
} from '@/utils/visit-status-badge'
import { getVisitProductStatusBadgeClassName } from '@/utils/visit-product-status-badge'

import { resolveGeneralNotesHtml } from '../utils/general-notes-html'
import {
  getReportCreatedAt,
  getReportReferenceDate,
  getReportReferenceTime,
  getSortedInspectionItems,
  getSortedPhotos,
} from '../utils/report-details'

import './visit-report-preview.css'

export type VisitReportPreviewProps = {
  details: VisitDetails
  generalNotesHtml?: string | null
  className?: string
}

function ReportSectionTitle({
  title,
  icon,
}: {
  title: string
  icon?: 'performance' | 'inspection' | 'photos'
}) {
  const Icon =
    icon === 'performance'
      ? BarChart3
      : icon === 'inspection'
        ? ClipboardList
        : icon === 'photos'
          ? Camera
          : null

  return (
    <h2 className="visit-report-preview__section-title">
      {Icon ? <Icon className="visit-report-preview__section-icon" aria-hidden /> : null}
      {title}
    </h2>
  )
}

function ReportInfoField({
  label,
  value,
  badgeClassName,
}: {
  label: string
  value: string
  badgeClassName?: string
}) {
  return (
    <div>
      <div className="visit-report-preview__field-label">{label}</div>
      {badgeClassName ? (
        <Badge variant="secondary" className={cn('mt-1', badgeClassName)}>
          {value}
        </Badge>
      ) : (
        <div className="visit-report-preview__field-value">{value}</div>
      )}
    </div>
  )
}

export function VisitReportPreview({
  details,
  generalNotesHtml,
  className,
}: VisitReportPreviewProps) {
  const statusLabel = resolveVisitBadgeDisplay({
    status: details.status,
    reviewDecision: details.reviewDecision,
  })
  const statusBadge = getVisitStatusBadgeProps(statusLabel)
  const sortedItems = getSortedInspectionItems(details)
  const sortedPhotos = getSortedPhotos(details)
  const notesHtml = resolveGeneralNotesHtml(details.generalNotes, generalNotesHtml)
  const generatedAt = formatPdfDateTime(new Date().toISOString())

  return (
    <div className={cn('visit-report-preview', className)}>
      <div className="visit-report-preview__shell">
        <article className="visit-report-preview__page">
          <header className="visit-report-preview__header">
            <div className="visit-report-preview__brand">
              <img
                src={LOGO_PATH}
                alt={LOGO_ALT}
                className="visit-report-preview__logo"
              />
              <div className="visit-report-preview__brand-copy">
                <div className="visit-report-preview__app-name">{APP_NAME}</div>
                <div className="visit-report-preview__tagline">{APP_TAGLINE}</div>
                <div className="visit-report-preview__subtitle">Visit Report</div>
              </div>
            </div>

            <div className="visit-report-preview__meta">
              <div className="visit-report-preview__meta-label">Visit Number</div>
              <div className="visit-report-preview__meta-value visit-report-preview__meta-value--primary">
                {details.visitNumber}
              </div>
              <div className="visit-report-preview__meta-label">Visit Date</div>
              <div className="visit-report-preview__meta-value">
                {formatPdfDate(getReportReferenceDate(details))}
              </div>
              <div className="visit-report-preview__meta-label">Visit Time</div>
              <div className="visit-report-preview__meta-value">
                {formatPdfTime(getReportReferenceTime(details))}
              </div>
            </div>
          </header>

          <section className="visit-report-preview__section">
            <ReportSectionTitle title="Visit Information" />
            <div className="visit-report-preview__info-card">
              <div className="visit-report-preview__info-grid">
                <ReportInfoField label="Branch" value={details.branchName} />
                <ReportInfoField label="Visitor" value={details.visitorName} />
                <ReportInfoField
                  label="Status"
                  value={statusBadge.label}
                  badgeClassName={statusBadge.className}
                />
                <ReportInfoField
                  label="Created At"
                  value={formatPdfDateTime(getReportCreatedAt(details))}
                />
              </div>
            </div>
          </section>

          <section className="visit-report-preview__section">
            <ReportSectionTitle title="Branch Performance" icon="performance" />
            {details.performance.length === 0 ? (
              <p className="visit-report-preview__empty" role="status">
                No achievement data available for this branch.
              </p>
            ) : (
              <div className="visit-report-preview__table-wrap">
                <table className="visit-report-preview__table">
                  <thead>
                    <tr>
                      <th>Brand</th>
                      <th>Target</th>
                      <th>Actual</th>
                      <th>Achievement %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.performance.map((row) => (
                      <tr key={row.brand}>
                        <td>{row.brand}</td>
                        <td data-align="center">
                          {formatNumberWithSeparators(row.mtdTarget)}
                        </td>
                        <td data-align="center">
                          {formatNumberWithSeparators(row.actualSales)}
                        </td>
                        <td data-align="center">
                          <Badge
                            variant="secondary"
                            className={cn(
                              'font-bold tabular-nums',
                              getAchievementBadgeClassName(row.achievementPercent),
                            )}
                          >
                            {formatAchievementPercent(row.achievementPercent)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="visit-report-preview__section">
            <ReportSectionTitle title="Inspection Items" icon="inspection" />
            {sortedItems.length === 0 ? (
              <p className="visit-report-preview__empty" role="status">
                No inspection items reported.
              </p>
            ) : (
              <div className="visit-report-preview__table-wrap">
                <table className="visit-report-preview__table">
                  <thead>
                    <tr>
                      <th>Brand</th>
                      <th>Product Name</th>
                      <th>Status</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedItems.map((item) => (
                      <tr key={item.id}>
                        <td>{item.brand}</td>
                        <td>{item.productName}</td>
                        <td data-align="center">
                          <Badge
                            variant="secondary"
                            className={getVisitProductStatusBadgeClassName(item.status)}
                          >
                            {item.statusLabel}
                          </Badge>
                        </td>
                        <td className="whitespace-pre-wrap">
                          {item.notes?.trim() || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="visit-report-preview__section">
            <ReportSectionTitle title="Visit Photos" icon="photos" />
            {sortedPhotos.length === 0 ? (
              <p className="visit-report-preview__empty" role="status">
                No visit photos.
              </p>
            ) : (
              <div className="visit-report-preview__photos">
                {sortedPhotos.map((photo) => (
                  <div key={photo.id} className="visit-report-preview__photo-frame">
                    <img src={photo.previewUrl} alt={photo.fileName} loading="lazy" />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="visit-report-preview__section">
            <ReportSectionTitle title="General Notes" />
            {notesHtml ? (
              <div className="visit-report-preview__general-notes">
                <div
                  className="visit-report-preview__general-notes-content"
                  dir="auto"
                  dangerouslySetInnerHTML={{ __html: notesHtml }}
                />
              </div>
            ) : (
              <p className="visit-report-preview__empty" role="status">
                No general notes.
              </p>
            )}
          </section>

          <footer className="visit-report-preview__footer">
            <div>{PDF_BRANDING.footerText}</div>
            <div>Generated at: {generatedAt}</div>
          </footer>
        </article>
      </div>
    </div>
  )
}
