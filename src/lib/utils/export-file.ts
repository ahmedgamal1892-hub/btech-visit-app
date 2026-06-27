export function escapeCsvValue(value: string | number): string {
  const stringValue = String(value)
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function downloadFile(
  filename: string,
  content: string,
  mimeType: string,
) {
  downloadBlob(filename, new Blob([content], { type: mimeType }))
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number>>,
) {
  const content = [headers, ...rows]
    .map((row) => row.map(escapeCsvValue).join(','))
    .join('\n')

  downloadFile(filename, content, 'text/csv;charset=utf-8;')
}
