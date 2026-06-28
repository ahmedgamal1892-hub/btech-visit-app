import { Loader2, Upload } from 'lucide-react'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'

import { AlertBanner, PageHeader, PageLoading } from '@/components/common'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/toast'
import {
  ExcelUploadCard,
  ImportPreviewPanel,
  ImportSummaryPanel,
} from '@/features/daily-upload/components'
import {
  useConfirmImport,
  useImportSettings,
  useLogFailedImport,
} from '@/features/daily-upload/hooks'
import { hashImportPayload } from '@/lib/import/hash'
import {
  isAllowedExcelFile,
  isWithinSizeLimit,
  parseDailyWorkbook,
} from '@/lib/import/parse-excel'
import { validateDailyImportPayload } from '@/lib/import/validate-import'
import { useAuth } from '@/hooks'
import type {
  ImportSheetSummary,
  ImportValidationError,
} from '@/types/import'

export function DailyUploadPage() {
  const { user, isAdmin, isLoading: isAuthLoading } = useAuth()
  const { toast } = useToast()
  const { data: importSettings } = useImportSettings()
  const confirmImportMutation = useConfirmImport()
  const logFailedImportMutation = useLogFailedImport()

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileErrors, setFileErrors] = useState<ImportValidationError[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadMessage, setUploadMessage] = useState('')
  const [importSummary, setImportSummary] = useState<ImportSheetSummary | null>(
    null,
  )
  const [completedSuccessfully, setCompletedSuccessfully] = useState(false)
  const [preview, setPreview] =
    useState<ReturnType<typeof validateDailyImportPayload>['preview']>(null)

  const settings = importSettings ?? {
    allowedExtensions: ['xlsx', 'xls'],
    maxFileSizeMb: 10,
  }

  const isUploading = confirmImportMutation.isPending

  if (isAuthLoading) {
    return <PageLoading message="Loading daily upload..." />
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  const handleDailyFileSelect = async (file: File) => {
    setSelectedFile(file)
    setImportSummary(null)
    setCompletedSuccessfully(false)
    setPreview(null)
    setFileErrors([])
    setUploadProgress(0)
    setUploadMessage('')

    const nextFileErrors: ImportValidationError[] = []

    if (!isAllowedExcelFile(file, settings.allowedExtensions)) {
      nextFileErrors.push({
        sheet: 'general',
        message: `Invalid file type. Allowed: ${settings.allowedExtensions.join(', ')}`,
      })
      setFileErrors(nextFileErrors)
      return
    }

    if (!isWithinSizeLimit(file, settings.maxFileSizeMb)) {
      nextFileErrors.push({
        sheet: 'general',
        message: `File exceeds ${settings.maxFileSizeMb} MB limit.`,
      })
      setFileErrors(nextFileErrors)
      return
    }

    if (!user?.id) {
      nextFileErrors.push({
        sheet: 'general',
        message: 'Authenticated user is required to import the daily file.',
      })
      setFileErrors(nextFileErrors)
      return
    }

    setUploadProgress(10)
    setUploadMessage('Reading workbook...')

    try {
      const buffer = await file.arrayBuffer()
      const parsedWorkbook = parseDailyWorkbook(buffer)
      let validation = validateDailyImportPayload(
        parsedWorkbook,
        nextFileErrors,
        false,
      )

      setPreview(validation.preview)
      setFileErrors(validation.errors)
      setImportSummary(validation.sheetSummary)

      if (!validation.isValid || !validation.sheetSummary) {
        setUploadMessage('')
        setUploadProgress(0)

        toast({
          variant: 'error',
          title: 'Import validation failed',
          description:
            validation.errors.find((error) => error.sheet === 'general')
              ?.message ??
            'Fix the workbook issues and upload the daily visit file again.',
        })
        return
      }

      setUploadProgress(35)
      setUploadMessage('Importing worksheets...')

      const displayHash = validation.importFlags.display
        ? await hashImportPayload(validation.storeDisplay)
        : null
      const achHash = validation.importFlags.ach
        ? await hashImportPayload(validation.salesAchievement)
        : null
      const rankingHash = validation.importFlags.ranking
        ? await hashImportPayload(validation.ranking)
        : null

      const result = await confirmImportMutation.mutateAsync({
        uploadedBy: user.id,
        fileName: file.name,
        displayHash,
        achHash,
        rankingHash,
        validationReport: {
          preview: validation.preview,
          uploaded_at: new Date().toISOString(),
          workbook_file: file.name,
          import_flags: validation.importFlags,
          sheet_summary: validation.sheetSummary,
        },
        stores: validation.stores,
        storeDisplay: validation.storeDisplay,
        salesAchievement: validation.salesAchievement,
        ranking: validation.ranking,
        importFlags: validation.importFlags,
      })

      setUploadProgress(90)

      if (!result.success) {
        await logFailedImportMutation.mutateAsync({
          uploadedBy: user.id,
          fileName: file.name,
          displayHash,
          achHash,
          rankingHash,
          validationErrors: validation.errors,
          errorLog: { message: result.message },
        })

        setUploadMessage('')
        setUploadProgress(0)

        toast({
          variant: 'error',
          title: 'Upload failed',
          description: result.message,
        })
        return
      }

      validation = validateDailyImportPayload(
        parsedWorkbook,
        nextFileErrors,
        true,
      )

      setUploadProgress(100)
      setUploadMessage('Upload complete')
      setImportSummary(validation.sheetSummary)
      setCompletedSuccessfully(true)

      toast({
        variant: 'success',
        title: 'Daily upload successful',
        description: 'The daily visit workbook was imported successfully.',
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unexpected upload error.'

      if (user?.id) {
        await logFailedImportMutation.mutateAsync({
          uploadedBy: user.id,
          fileName: file.name,
          validationErrors: fileErrors,
          errorLog: { message },
        })
      }

      setUploadMessage('')
      setUploadProgress(0)

      toast({
        variant: 'error',
        title: 'Upload failed',
        description: message,
      })
    } finally {
      window.setTimeout(() => {
        setUploadProgress(0)
        setUploadMessage('')
      }, 1200)
    }
  }

  const handleClearFile = () => {
    setSelectedFile(null)
    setFileErrors([])
    setPreview(null)
    setImportSummary(null)
    setCompletedSuccessfully(false)
    setUploadProgress(0)
    setUploadMessage('')
  }

  const sheetErrors = (sheet: ImportValidationError['sheet']) =>
    fileErrors.filter((error) => error.sheet === sheet)

  return (
    <div className="page-stack">
      <PageHeader
        title="Daily Upload"
        description="Upload one Excel workbook. Include any combination of Display, ACH, and Ranking worksheets."
        icon={Upload}
      />

      <ExcelUploadCard
        title="Daily Visit Workbook"
        description="Worksheets are detected by name only. Missing worksheets are skipped and existing snapshot data is kept."
        file={selectedFile}
        allowedExtensions={settings.allowedExtensions}
        errors={fileErrors.filter((error) => error.sheet === 'general')}
        disabled={isUploading}
        uploadButtonLabel="Upload Daily Visit File"
        onFileSelect={(file) => void handleDailyFileSelect(file)}
        onClear={handleClearFile}
      />

      <ImportPreviewPanel preview={preview} />

      {importSummary ? (
        <ImportSummaryPanel
          summary={importSummary}
          completedSuccessfully={completedSuccessfully}
        />
      ) : null}

      {sheetErrors('display').length > 0 ||
      sheetErrors('ach').length > 0 ||
      sheetErrors('ranking').length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-3">
          {(['display', 'ach', 'ranking'] as const).map((sheet) => {
            const errors = sheetErrors(sheet)
            if (errors.length === 0) {
              return null
            }

            const title =
              sheet === 'display'
                ? 'Display Validation Errors'
                : sheet === 'ach'
                  ? 'ACH Validation Errors'
                  : 'Ranking Validation Errors'

            return (
              <AlertBanner key={sheet} variant="warning" title={title}>
                <ul className="space-y-1">
                  {errors.slice(0, 5).map((error, index) => (
                    <li key={`${error.message}-${index}`}>
                      {error.row
                        ? `Row ${error.row}${error.column ? ` · ${error.column}` : ''}: ${error.message}`
                        : error.message}
                    </li>
                  ))}
                  {errors.length > 5 ? (
                    <li>+{errors.length - 5} more validation errors</li>
                  ) : null}
                </ul>
              </AlertBanner>
            )
          })}
        </div>
      ) : null}

      {fileErrors.some((error) => error.sheet === 'general') && (
        <AlertBanner variant="warning" title="Validation issues">
          {fileErrors
            .filter((error) => error.sheet === 'general')
            .map((error) => error.message)
            .join(' ')}
        </AlertBanner>
      )}

      {isUploading && (
        <div className="surface-card space-y-2 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium text-foreground">
              <Loader2 className="size-4 animate-spin" />
              {uploadMessage || 'Uploading...'}
            </span>
            <span className="text-muted-foreground">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} />
        </div>
      )}
    </div>
  )
}
