export function isNotesDebugPreviewEnabled(): boolean {
  return import.meta.env.VITE_DEBUG_NOTES_PREVIEW === 'true'
}

export function isReportPreviewEnabled(): boolean {
  return import.meta.env.VITE_DEBUG_REPORT_PREVIEW === 'true'
}
