import { describe, expect, it } from 'vitest'

import { PDF_BRANDING } from '@/lib/constants/branding'

import {
  mockFollowUpVisitDetails,
  mockVisitDetails,
} from './__fixtures__/visit-details.mock'
import { mapVisitDetailsToReportViewModel } from './visit-details.mapper'

describe('mapVisitDetailsToReportViewModel', () => {
  it('maps visit information fields', () => {
    const viewModel = mapVisitDetailsToReportViewModel(mockVisitDetails, {
      generatedAt: 'Jun 26, 2026, 12:00 PM',
    })

    expect(viewModel.visitNumber).toBe('VIS-20260626-0001')
    expect(viewModel.branchName).toBe('Main Branch — Cairo')
    expect(viewModel.visitorName).toBe('Ahmed Hassan')
    expect(viewModel.brandName).toBe('Multi-Brand')
    expect(viewModel.visitType).toBe('Routine Inspection')
    expect(viewModel.visitStatus).toBe('Submitted')
    expect(viewModel.visitStatusTone).toBe('info')
    expect(viewModel.appName).toBe(PDF_BRANDING.appName)
    expect(viewModel.footerText).toBe(PDF_BRANDING.footerText)
  })

  it('maps branch performance using existing formatters', () => {
    const viewModel = mapVisitDetailsToReportViewModel(mockVisitDetails)

    expect(viewModel.performance).toHaveLength(3)
    expect(viewModel.performance[0]).toEqual({
      brand: 'Samsung',
      target: '100,000',
      actual: '92,500',
      achievementPercent: '92.5%',
      achievementTone: 'success',
    })
    expect(viewModel.performance[2]?.achievementTone).toBe('danger')
  })

  it('maps inspection items in display order with notes fallback', () => {
    const viewModel = mapVisitDetailsToReportViewModel(mockVisitDetails)

    expect(viewModel.inspectionItems.map((item) => item.id)).toEqual([
      'item-1',
      'item-2',
      'item-3',
    ])
    expect(viewModel.inspectionItems[0]?.productName).toContain('AQD1070D 497 XEX')
    expect(viewModel.inspectionItems[2]?.notes).toBe('—')
    expect(viewModel.inspectionItems[0]?.statusTone).toBe('success')
  })

  it('maps visit photos in sort order', () => {
    const viewModel = mapVisitDetailsToReportViewModel(mockVisitDetails)

    expect(viewModel.photos.map((photo) => photo.id)).toEqual([
      'photo-1',
      'photo-2',
    ])
    expect(viewModel.photos[0]?.src).toBe('https://example.com/photo-1.jpg')
  })

  it('maps plain-text general notes to html', () => {
    const viewModel = mapVisitDetailsToReportViewModel(mockVisitDetails)

    expect(viewModel.generalNotesHtml).toContain('AQD1070D 497 XEX')
    expect(viewModel.generalNotesHtml).toContain('<ul dir="rtl">')
    expect(viewModel.generalNotesHtml).toContain('dir="rtl"')
  })

  it('prefers a provided general notes html override', () => {
    const viewModel = mapVisitDetailsToReportViewModel(mockVisitDetails, {
      generalNotesHtml: '<p dir="ltr">Override note</p>',
    })

    expect(viewModel.generalNotesHtml).toBe('<p dir="ltr">Override note</p>')
  })

  it('maps follow-up visits and empty sections', () => {
    const viewModel = mapVisitDetailsToReportViewModel(mockFollowUpVisitDetails)

    expect(viewModel.visitType).toBe('Follow-up Visit')
    expect(viewModel.visitStatus).toBe('Draft')
    expect(viewModel.visitStatusTone).toBe('neutral')
    expect(viewModel.performance).toEqual([])
    expect(viewModel.inspectionItems).toEqual([])
    expect(viewModel.photos).toEqual([])
    expect(viewModel.generalNotesHtml).toBe('')
    expect(viewModel.brandName).toBe('—')
  })
})
