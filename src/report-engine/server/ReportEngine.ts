/**
 * Report Engine V2 — server-only entry point (Node / scripts).
 */

import {
  defaultSamplePdfPath,
  generateSampleReportPdf,
} from './pdf'

export class ReportEngine {
  static readonly samplePdfOutputPath = defaultSamplePdfPath

  static async generateSamplePdf(
    outputPath = defaultSamplePdfPath,
  ): Promise<string> {
    return generateSampleReportPdf(outputPath)
  }
}

export { generateSampleReportPdf, defaultSamplePdfPath }
