import '../styles/report.css'

import {
  BranchPerformanceTable,
  GeneralNotesCard,
  InspectionTable,
  PhotoGrid,
  ReportFooter,
  ReportHeader,
  SectionCard,
  VisitInformationCard,
} from '../components'
import type { ReportViewModel } from '../models/report-view-model'

type VisitReportTemplateProps = {
  data: ReportViewModel
}

export function VisitReportTemplate({ data }: VisitReportTemplateProps) {
  return (
    <div className="report-engine">
      <article className="report-page">
        <ReportHeader
          appName={data.appName}
          tagline={data.tagline}
          reportTitle={data.reportTitle}
          logoSrc={data.logoSrc}
          logoAlt={data.logoAlt}
          visitNumber={data.visitNumber}
          visitDate={data.visitDate}
        />

        <SectionCard title="Visit Information">
          <VisitInformationCard
            branchName={data.branchName}
            brandName={data.brandName}
            visitorName={data.visitorName}
            visitType={data.visitType}
            visitStatus={data.visitStatus}
            visitStatusTone={data.visitStatusTone}
            createdDate={data.createdDate}
          />
        </SectionCard>

        <SectionCard title="Branch Performance" icon="performance">
          <BranchPerformanceTable rows={data.performance} />
        </SectionCard>

        <SectionCard title="Inspection Items" icon="inspection">
          <InspectionTable items={data.inspectionItems} />
        </SectionCard>

        <SectionCard title="Visit Photos" icon="photos">
          <PhotoGrid photos={data.photos} />
        </SectionCard>

        <SectionCard title="General Notes">
          <GeneralNotesCard html={data.generalNotesHtml} />
        </SectionCard>

        <ReportFooter
          footerText={data.footerText}
          generatedAt={data.generatedAt}
        />
      </article>
    </div>
  )
}
