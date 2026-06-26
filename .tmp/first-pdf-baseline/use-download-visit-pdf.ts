import { useMutation } from '@tanstack/react-query'

import { downloadVisitPdfById } from '@/services/pdf/visit-pdf.service'

export function useDownloadVisitPdf() {
  return useMutation({
    mutationFn: (visitId: string) => downloadVisitPdfById(visitId),
  })
}
