import { getAchievementBadgeClassName } from '@/utils/achievement-badge'
import {
  getVisitStatusBadgeProps,
  type VisitBadgeDisplay,
} from '@/utils/visit-status-badge'
import { getVisitProductStatusBadgeClassName } from '@/utils/visit-product-status-badge'
import type { VisitProductStatus } from '@/types/visit'

import type { ReportBadgeTone } from '../models/report-view-model'

function badgeClassNameToTone(className: string): ReportBadgeTone {
  if (className.includes('emerald')) {
    return 'success'
  }

  if (className.includes('orange')) {
    return 'warning'
  }

  if (className.includes('red')) {
    return 'danger'
  }

  if (className.includes('blue')) {
    return 'info'
  }

  return 'neutral'
}

export function mapAchievementTone(percent: number): ReportBadgeTone {
  return badgeClassNameToTone(getAchievementBadgeClassName(percent))
}

export function mapVisitStatusTone(display: VisitBadgeDisplay): ReportBadgeTone {
  return badgeClassNameToTone(getVisitStatusBadgeProps(display).className)
}

export function mapProductStatusTone(
  status: VisitProductStatus,
): ReportBadgeTone {
  return badgeClassNameToTone(getVisitProductStatusBadgeClassName(status))
}
