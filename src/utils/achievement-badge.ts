export type PdfRgbColor = [number, number, number]

export type PdfBadgeColors = {
  fill: PdfRgbColor
  text: PdfRgbColor
}

export function getAchievementBadgePdfColors(percent: number): PdfBadgeColors {
  if (percent >= 90) {
    return {
      fill: [209, 250, 229],
      text: [6, 95, 70],
    }
  }

  if (percent >= 70) {
    return {
      fill: [255, 237, 213],
      text: [194, 65, 12],
    }
  }

  return {
    fill: [254, 226, 226],
    text: [185, 28, 28],
  }
}

export function getAchievementBadgeClassName(percent: number): string {
  if (percent >= 90) {
    return 'bg-emerald-100 text-emerald-800'
  }

  if (percent >= 70) {
    return 'bg-orange-100 text-orange-700'
  }

  return 'bg-red-100 text-red-700'
}
