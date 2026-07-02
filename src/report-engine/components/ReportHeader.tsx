import { ReportDirectionalText, ReportMixedText } from './ReportMixedText'

type ReportHeaderProps = {
  appName: string
  tagline: string
  reportTitle: string
  logoSrc?: string
  logoAlt: string
  visitNumber: string
  visitDate: string
}

export function ReportHeader({
  appName,
  tagline,
  reportTitle,
  logoSrc,
  logoAlt,
  visitNumber,
  visitDate,
}: ReportHeaderProps) {
  return (
    <header className="report-header">
      <div className="report-header__brand">
        {logoSrc ? (
          <img
            className="report-header__logo-image"
            src={logoSrc}
            alt={logoAlt}
          />
        ) : (
          <div className="report-header__logo" aria-hidden="true">
            <span className="report-header__logo-label">Logo</span>
          </div>
        )}
        <div className="report-header__brand-copy" dir="ltr">
          <p className="report-header__app-name">{appName}</p>
          <p className="report-header__tagline">{tagline}</p>
          <p className="report-header__report-title">{reportTitle}</p>
        </div>
      </div>

      <dl className="report-header__meta">
        <div className="report-header__meta-item">
          <dt className="report-header__meta-label">Visit Number</dt>
          <dd className="report-header__meta-value report-header__meta-value--primary">
            <ReportMixedText text={visitNumber} />
          </dd>
        </div>
        <div className="report-header__meta-item">
          <dt className="report-header__meta-label">Visit Date</dt>
          <dd className="report-header__meta-value">
            <ReportDirectionalText text={visitDate} direction="ltr" />
          </dd>
        </div>
      </dl>
    </header>
  )
}
