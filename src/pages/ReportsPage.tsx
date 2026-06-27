import { FileBarChart } from 'lucide-react'
import { Suspense, useCallback } from 'react'

import { ErrorState, PageHeader } from '@/components/common'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BranchReportSection,
  createDefaultReportsFilters,
  ExecutiveReportSection,
  PerformanceReportSection,
  PhotoReportSection,
  ProductReportSection,
  ReportsFiltersBar,
  ReportsSectionNav,
  useReportsCenter,
  VisitorReportSection,
} from '@/features/reports'
import type { ReportSectionId } from '@/features/reports/types/reports.types'
import { usePersistedState } from '@/hooks'

const REPORTS_FILTERS_KEY = 'btech:reports:filters'
const REPORTS_SECTION_KEY = 'btech:reports:active-section'

function ReportSectionFallback() {
  return <Skeleton className="h-96 w-full rounded-xl" />
}

export function ReportsPage() {
  const [filters, setFilters] = usePersistedState(
    REPORTS_FILTERS_KEY,
    createDefaultReportsFilters(),
  )
  const [activeSection, setActiveSection] = usePersistedState<ReportSectionId>(
    REPORTS_SECTION_KEY,
    'executive',
  )
  const { data, filterOptions, isLoading, isFetching, isError, refetch } =
    useReportsCenter(filters)

  const handleReset = useCallback(() => {
    setFilters(createDefaultReportsFilters())
  }, [setFilters])

  const sectionId = `report-section-${activeSection}`

  const renderSection = () => {
    if (isLoading && !data) {
      return <ReportSectionFallback />
    }

    const section = (
      <>
        {activeSection === 'executive' ? (
          <ExecutiveReportSection
            data={data?.executive}
            sectionId={sectionId}
          />
        ) : null}
        {activeSection === 'visitor' ? (
          <VisitorReportSection
            rows={data?.visitors ?? []}
            sectionId={sectionId}
          />
        ) : null}
        {activeSection === 'branch' ? (
          <BranchReportSection
            rows={data?.branches ?? []}
            sectionId={sectionId}
          />
        ) : null}
        {activeSection === 'product' ? (
          <ProductReportSection
            rows={data?.products ?? []}
            sectionId={sectionId}
          />
        ) : null}
        {activeSection === 'photo' ? (
          <PhotoReportSection data={data?.photos} sectionId={sectionId} />
        ) : null}
        {activeSection === 'performance' ? (
          <PerformanceReportSection
            data={data?.performance}
            sectionId={sectionId}
          />
        ) : null}
      </>
    )

    return <Suspense fallback={<ReportSectionFallback />}>{section}</Suspense>
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Reports Center"
        description="Enterprise reporting across visits, branches, products, photos, and performance."
        icon={FileBarChart}
      />

      <ReportsFiltersBar
        filters={filters}
        options={filterOptions}
        onChange={setFilters}
        onReset={handleReset}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching}
      />

      {isError ? (
        <ErrorState
          title="Unable to load reports data"
          message="Please try again in a moment."
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      ) : null}

      <ReportsSectionNav
        activeSection={activeSection}
        onChange={setActiveSection}
      />

      <div className="surface-card p-4 md:p-6">{renderSection()}</div>
    </div>
  )
}
