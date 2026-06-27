import { EmptyState, MetricCard } from '@/components/common'
import { formatDashboardDateTime } from '@/features/dashboard/utils/build-executive-dashboard'

import type {
  BranchReportRow,
  ExecutiveReportData,
  PerformanceReportData,
  PhotoReportData,
  ProductReportRow,
  VisitorReportRow,
} from '../types/reports.types'
import {
  exportReportCsv,
  exportReportExcel,
  printReportSection,
} from '../utils/export-reports'
import {
  exportReportPdf,
  exportReportTablePdf,
} from '../utils/export-reports-pdf'
import { ReportChart } from './ReportChart'
import { ReportExportActions } from './ReportExportActions'
import { VirtualReportTable } from './VirtualReportTable'

type ExecutiveReportSectionProps = {
  data?: ExecutiveReportData
  sectionId: string
}

export function ExecutiveReportSection({
  data,
  sectionId,
}: ExecutiveReportSectionProps) {
  if (!data) {
    return (
      <EmptyState
        title="No executive data"
        description="Adjust filters to populate the executive report."
        useBrandLogo
      />
    )
  }

  const exportPdf = () =>
    exportReportPdf('Executive Report', 'executive-report.pdf', [
      {
        heading: 'Executive Summary',
        rows: [
          ['Total Visits', data.totalVisits],
          ['Completed Visits', data.completedVisits],
          ['Pending Visits', data.pendingVisits],
          ['Cancelled Visits', data.cancelledVisits],
          ['Branches Covered', data.branchesCovered],
          ['Products Checked', data.productsChecked],
          ['Photos Uploaded', data.photosUploaded],
          ['Visitors Active', data.visitorsActive],
          ['Average Visits Per Day', data.averageVisitsPerDay],
          ['Top Visitor', data.topVisitor],
          ['Top Branch', data.topBranch],
          ['Top Product', data.topProduct],
        ],
      },
    ])

  const exportExcel = () =>
    exportReportExcel('executive-report.xlsx', [
      {
        name: 'Executive',
        rows: [
          { Metric: 'Total Visits', Value: data.totalVisits },
          { Metric: 'Completed Visits', Value: data.completedVisits },
          { Metric: 'Pending Visits', Value: data.pendingVisits },
          { Metric: 'Cancelled Visits', Value: data.cancelledVisits },
          { Metric: 'Top Visitor', Value: data.topVisitor },
          { Metric: 'Top Branch', Value: data.topBranch },
          { Metric: 'Top Product', Value: data.topProduct },
        ],
      },
    ])

  const exportCsv = () =>
    exportReportCsv(
      'executive-report.csv',
      ['Metric', 'Value'],
      [
        ['Total Visits', data.totalVisits],
        ['Completed Visits', data.completedVisits],
        ['Pending Visits', data.pendingVisits],
        ['Cancelled Visits', data.cancelledVisits],
      ],
    )

  return (
    <div id={sectionId} className="space-y-5">
      <ReportExportActions
        onExportPdf={exportPdf}
        onExportExcel={exportExcel}
        onExportCsv={exportCsv}
        onPrint={() => printReportSection(sectionId)}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Visits" value={data.totalVisits} />
        <MetricCard label="Completed Visits" value={data.completedVisits} />
        <MetricCard label="Pending Visits" value={data.pendingVisits} />
        <MetricCard label="Cancelled Visits" value={data.cancelledVisits} />
        <MetricCard label="Branches Covered" value={data.branchesCovered} />
        <MetricCard label="Products Checked" value={data.productsChecked} />
        <MetricCard label="Photos Uploaded" value={data.photosUploaded} />
        <MetricCard label="Visitors Active" value={data.visitorsActive} />
        <MetricCard
          label="Average Visits Per Day"
          value={data.averageVisitsPerDay}
        />
        <MetricCard label="Top Visitor" value={data.topVisitor} />
        <MetricCard label="Top Branch" value={data.topBranch} />
        <MetricCard label="Top Product" value={data.topProduct} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="surface-card p-5">
          <h3 className="mb-4 font-semibold">Visit Status Mix</h3>
          <ReportChart type="pie" points={data.statusChart} />
        </div>
        <div className="surface-card p-5">
          <h3 className="mb-4 font-semibold">Visit Trend</h3>
          <ReportChart type="line" points={data.trendChart} />
        </div>
      </div>
    </div>
  )
}

type VisitorReportSectionProps = {
  rows: VisitorReportRow[]
  sectionId: string
}

export function VisitorReportSection({
  rows,
  sectionId,
}: VisitorReportSectionProps) {
  const exportAll = () => {
    exportReportTablePdf(
      'Visitor Report',
      'visitor-report.pdf',
      [
        'Visitor',
        'Visits',
        'Branches',
        'Products',
        'Photos',
        'Average/Day',
        'Last Visit',
      ],
      rows.map((row) => [
        row.visitorName,
        row.visits,
        row.branches,
        row.products,
        row.photos,
        row.averagePerDay,
        formatDashboardDateTime(row.lastVisit),
      ]),
    )
  }

  return (
    <div id={sectionId} className="space-y-5">
      <ReportExportActions
        onExportPdf={exportAll}
        onExportExcel={() =>
          exportReportExcel('visitor-report.xlsx', [
            {
              name: 'Visitors',
              rows: rows.map((row) => ({
                Visitor: row.visitorName,
                Visits: row.visits,
                Branches: row.branches,
                Products: row.products,
                Photos: row.photos,
                'Average Per Day': row.averagePerDay,
                'Last Visit': formatDashboardDateTime(row.lastVisit),
              })),
            },
          ])
        }
        onExportCsv={() =>
          exportReportCsv(
            'visitor-report.csv',
            [
              'Visitor',
              'Visits',
              'Branches',
              'Products',
              'Photos',
              'Average Per Day',
              'Last Visit',
            ],
            rows.map((row) => [
              row.visitorName,
              row.visits,
              row.branches,
              row.products,
              row.photos,
              row.averagePerDay,
              formatDashboardDateTime(row.lastVisit),
            ]),
          )
        }
        onPrint={() => printReportSection(sectionId)}
      />
      <VirtualReportTable
        rows={rows}
        rowKey={(row) => row.userId}
        columns={[
          {
            id: 'visitor',
            header: 'Visitor',
            cell: (row) => row.visitorName,
          },
          { id: 'visits', header: 'Visits', cell: (row) => row.visits },
          { id: 'branches', header: 'Branches', cell: (row) => row.branches },
          { id: 'products', header: 'Products', cell: (row) => row.products },
          { id: 'photos', header: 'Photos', cell: (row) => row.photos },
          {
            id: 'avg',
            header: 'Average/Day',
            cell: (row) => row.averagePerDay,
          },
          {
            id: 'lastVisit',
            header: 'Last Visit',
            cell: (row) => formatDashboardDateTime(row.lastVisit),
          },
        ]}
      />
    </div>
  )
}

type BranchReportSectionProps = {
  rows: BranchReportRow[]
  sectionId: string
}

export function BranchReportSection({
  rows,
  sectionId,
}: BranchReportSectionProps) {
  return (
    <div id={sectionId} className="space-y-5">
      <ReportExportActions
        onExportPdf={() =>
          exportReportTablePdf(
            'Branch Report',
            'branch-report.pdf',
            [
              'Branch',
              'Visits',
              'Last Visit',
              'Products',
              'Photos',
              'Score',
              'Top Issue',
              'Not Visited Days',
            ],
            rows.map((row) => [
              row.branchName,
              row.visitCount,
              formatDashboardDateTime(row.lastVisit),
              row.productsChecked,
              row.photos,
              row.averageScore,
              row.mostCommonIssue,
              row.notVisitedDays,
            ]),
          )
        }
        onExportExcel={() =>
          exportReportExcel('branch-report.xlsx', [
            {
              name: 'Branches',
              rows: rows.map((row) => ({
                Branch: row.branchName,
                Visits: row.visitCount,
                'Last Visit': formatDashboardDateTime(row.lastVisit),
                Products: row.productsChecked,
                Photos: row.photos,
                Score: row.averageScore,
                'Most Common Issue': row.mostCommonIssue,
                'Not Visited Days': row.notVisitedDays,
              })),
            },
          ])
        }
        onExportCsv={() =>
          exportReportCsv(
            'branch-report.csv',
            [
              'Branch',
              'Visits',
              'Last Visit',
              'Products',
              'Photos',
              'Score',
              'Most Common Issue',
              'Not Visited Days',
            ],
            rows.map((row) => [
              row.branchName,
              row.visitCount,
              formatDashboardDateTime(row.lastVisit),
              row.productsChecked,
              row.photos,
              row.averageScore,
              row.mostCommonIssue,
              row.notVisitedDays,
            ]),
          )
        }
        onPrint={() => printReportSection(sectionId)}
      />
      <VirtualReportTable
        rows={rows}
        rowKey={(row) => row.branchId ?? row.branchName}
        columns={[
          { id: 'branch', header: 'Branch', cell: (row) => row.branchName },
          { id: 'visits', header: 'Visits', cell: (row) => row.visitCount },
          {
            id: 'lastVisit',
            header: 'Last Visit',
            cell: (row) => formatDashboardDateTime(row.lastVisit),
          },
          {
            id: 'products',
            header: 'Products',
            cell: (row) => row.productsChecked,
          },
          { id: 'photos', header: 'Photos', cell: (row) => row.photos },
          { id: 'score', header: 'Score %', cell: (row) => row.averageScore },
          {
            id: 'issue',
            header: 'Most Common Issue',
            cell: (row) => row.mostCommonIssue,
          },
          {
            id: 'days',
            header: 'Not Visited Days',
            cell: (row) => row.notVisitedDays,
          },
        ]}
      />
    </div>
  )
}

type ProductReportSectionProps = {
  rows: ProductReportRow[]
  sectionId: string
}

export function ProductReportSection({
  rows,
  sectionId,
}: ProductReportSectionProps) {
  return (
    <div id={sectionId} className="space-y-5">
      <ReportExportActions
        onExportPdf={() =>
          exportReportTablePdf(
            'Product Report',
            'product-report.pdf',
            ['Product', 'Brand', 'Category', 'Observations', 'Photos', 'Rank'],
            rows.map((row) => [
              row.productName,
              row.brand,
              row.category,
              row.observations,
              row.photoCount,
              row.rank,
            ]),
          )
        }
        onExportExcel={() =>
          exportReportExcel('product-report.xlsx', [
            {
              name: 'Products',
              rows: rows.map((row) => ({
                Product: row.productName,
                Brand: row.brand,
                Category: row.category,
                Observations: row.observations,
                Photos: row.photoCount,
                Rank: row.rank,
              })),
            },
          ])
        }
        onExportCsv={() =>
          exportReportCsv(
            'product-report.csv',
            ['Product', 'Brand', 'Category', 'Observations', 'Photos', 'Rank'],
            rows.map((row) => [
              row.productName,
              row.brand,
              row.category,
              row.observations,
              row.photoCount,
              row.rank,
            ]),
          )
        }
        onPrint={() => printReportSection(sectionId)}
      />
      <VirtualReportTable
        rows={rows}
        rowKey={(row) => `${row.productName}-${row.brand}`}
        columns={[
          { id: 'product', header: 'Product', cell: (row) => row.productName },
          { id: 'brand', header: 'Brand', cell: (row) => row.brand },
          { id: 'category', header: 'Category', cell: (row) => row.category },
          {
            id: 'observations',
            header: 'Observations',
            cell: (row) => row.observations,
          },
          { id: 'photos', header: 'Photos', cell: (row) => row.photoCount },
          { id: 'rank', header: 'Rank', cell: (row) => row.rank },
        ]}
      />
    </div>
  )
}

type PhotoReportSectionProps = {
  data?: PhotoReportData
  sectionId: string
}

export function PhotoReportSection({
  data,
  sectionId,
}: PhotoReportSectionProps) {
  if (!data) {
    return (
      <EmptyState
        title="No photo data"
        description="Adjust filters to populate photo analytics."
        useBrandLogo
      />
    )
  }

  return (
    <div id={sectionId} className="space-y-5">
      <ReportExportActions
        onExportPdf={() =>
          exportReportPdf('Photo Report', 'photo-report.pdf', [
            { heading: 'Summary', rows: [['Total Photos', data.totalPhotos]] },
          ])
        }
        onExportExcel={() =>
          exportReportExcel('photo-report.xlsx', [
            {
              name: 'Summary',
              rows: [{ Metric: 'Total Photos', Value: data.totalPhotos }],
            },
          ])
        }
        onExportCsv={() =>
          exportReportCsv(
            'photo-report.csv',
            ['Metric', 'Value'],
            [['Total Photos', data.totalPhotos]],
          )
        }
        onPrint={() => printReportSection(sectionId)}
      />
      <MetricCard label="Total Photos" value={data.totalPhotos} />
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="surface-card p-5">
          <h3 className="mb-4 font-semibold">Photos by Visitor</h3>
          <ReportChart type="bar" points={data.byVisitor} />
        </div>
        <div className="surface-card p-5">
          <h3 className="mb-4 font-semibold">Photos by Branch</h3>
          <ReportChart type="bar" points={data.byBranch} />
        </div>
        <div className="surface-card p-5">
          <h3 className="mb-4 font-semibold">Photos by Product</h3>
          <ReportChart type="heatmap" points={data.byProduct} />
        </div>
        <div className="surface-card p-5">
          <h3 className="mb-4 font-semibold">Photo Timeline</h3>
          <ReportChart type="area" points={data.timeline} />
        </div>
      </div>
    </div>
  )
}

type PerformanceReportSectionProps = {
  data?: PerformanceReportData
  sectionId: string
}

export function PerformanceReportSection({
  data,
  sectionId,
}: PerformanceReportSectionProps) {
  if (!data) {
    return (
      <EmptyState
        title="No performance data"
        description="Adjust filters to populate performance trends."
        useBrandLogo
      />
    )
  }

  const periodTable = (periods: PerformanceReportData['daily']) => (
    <VirtualReportTable
      rows={periods}
      rowKey={(row) => row.label}
      columns={[
        { id: 'label', header: 'Period', cell: (row) => row.label },
        { id: 'visits', header: 'Visits', cell: (row) => row.visits },
        {
          id: 'growth',
          header: 'Growth %',
          cell: (row) => row.growthPercent ?? '—',
        },
      ]}
      height={280}
    />
  )

  return (
    <div id={sectionId} className="space-y-5">
      <ReportExportActions
        onExportPdf={() =>
          exportReportPdf('Performance Report', 'performance-report.pdf', [
            {
              heading: 'Monthly Trend',
              rows: data.monthly.map((row) => [row.label, row.visits]),
            },
          ])
        }
        onExportExcel={() =>
          exportReportExcel('performance-report.xlsx', [
            {
              name: 'Monthly',
              rows: data.monthly.map((row) => ({
                Period: row.label,
                Visits: row.visits,
                Growth: row.growthPercent ?? 0,
              })),
            },
          ])
        }
        onExportCsv={() =>
          exportReportCsv(
            'performance-report.csv',
            ['Period', 'Visits', 'Growth %'],
            data.monthly.map((row) => [
              row.label,
              row.visits,
              row.growthPercent ?? 0,
            ]),
          )
        }
        onPrint={() => printReportSection(sectionId)}
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="surface-card p-5">
          <h3 className="mb-4 font-semibold">Trend</h3>
          <ReportChart type="line" points={data.trendChart} />
        </div>
        <div className="surface-card p-5">
          <h3 className="mb-4 font-semibold">Growth</h3>
          <ReportChart type="bar" points={data.growthChart} />
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="space-y-3">
          <h3 className="font-semibold">Daily</h3>
          {periodTable(data.daily)}
        </div>
        <div className="space-y-3">
          <h3 className="font-semibold">Weekly</h3>
          {periodTable(data.weekly)}
        </div>
        <div className="space-y-3">
          <h3 className="font-semibold">Monthly</h3>
          {periodTable(data.monthly)}
        </div>
        <div className="space-y-3">
          <h3 className="font-semibold">Quarterly</h3>
          {periodTable(data.quarterly)}
        </div>
        <div className="space-y-3 xl:col-span-2">
          <h3 className="font-semibold">Yearly</h3>
          {periodTable(data.yearly)}
        </div>
      </div>
    </div>
  )
}
