import { ReportDirectionalText } from './ReportMixedText'

type ReportFooterProps = {
  footerText: string
  generatedAt: string
}

export function ReportFooter({ footerText, generatedAt }: ReportFooterProps) {
  return (
    <footer className="report-footer" dir="ltr">
      <p className="report-footer__text">{footerText}</p>
      <p className="report-footer__generated">
        Generated at:{' '}
        <ReportDirectionalText text={generatedAt} direction="ltr" />
      </p>
    </footer>
  )
}
