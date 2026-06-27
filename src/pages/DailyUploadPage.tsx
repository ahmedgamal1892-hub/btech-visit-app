import { Loader2, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'

import { PageHeader } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/toast'
import {
  ExcelUploadCard,
  ImportPreviewPanel,
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
  parseAchWorkbook,
  parseDisplayWorkbook,
} from '@/lib/import/parse-excel'
import { validateImportPayload } from '@/lib/import/validate-import'
import { useAuth } from '@/hooks'
import type {
  ImportValidationError,
  ParsedAchSheet,
  ParsedDisplaySheet,
} from '@/types/import'

type ParsedFileState<T> = {
  file: File
  data: T | null
  errors: ImportValidationError[]
}

export function DailyUploadPage() {
  const { user, isAdmin, isLoading: isAuthLoading } = useAuth()
  const { toast } = useToast()
  const { data: importSettings } = useImportSettings()
  const confirmImportMutation = useConfirmImport()
  const logFailedImportMutation = useLogFailedImport()

  const [displayState, setDisplayState] =
    useState<ParsedFileState<ParsedDisplaySheet> | null>(null)
  const [achState, setAchState] =
    useState<ParsedFileState<ParsedAchSheet> | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadMessage, setUploadMessage] = useState('')

  const settings = importSettings ?? {
    allowedExtensions: ['xlsx', 'xls'],
    maxFileSizeMb: 10,
  }

  const validation = useMemo(
    () =>
      validateImportPayload(
        displayState?.data ?? null,
        achState?.data ?? null,
        [...(displayState?.errors ?? []), ...(achState?.errors ?? [])],
      ),
    [displayState, achState],
  )

  const isUploading = confirmImportMutation.isPending

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading daily upload...
      </div>
    )
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  const parseAndSetDisplay = async (file: File) => {
    const fileErrors: ImportValidationError[] = []

    if (!isAllowedExcelFile(file, settings.allowedExtensions)) {
      fileErrors.push({
        sheet: 'display',
        message: `Invalid file type. Allowed: ${settings.allowedExtensions.join(', ')}`,
      })
      setDisplayState({ file, data: null, errors: fileErrors })
      return
    }

    if (!isWithinSizeLimit(file, settings.maxFileSizeMb)) {
      fileErrors.push({
        sheet: 'display',
        message: `File exceeds ${settings.maxFileSizeMb} MB limit.`,
      })
      setDisplayState({ file, data: null, errors: fileErrors })
      return
    }

    const buffer = await file.arrayBuffer()
    const parsed = parseDisplayWorkbook(buffer)
    setDisplayState({
      file,
      data: parsed.data,
      errors: parsed.errors,
    })
  }

  const parseAndSetAch = async (file: File) => {
    const fileErrors: ImportValidationError[] = []

    if (!isAllowedExcelFile(file, settings.allowedExtensions)) {
      fileErrors.push({
        sheet: 'ach',
        message: `Invalid file type. Allowed: ${settings.allowedExtensions.join(', ')}`,
      })
      setAchState({ file, data: null, errors: fileErrors })
      return
    }

    if (!isWithinSizeLimit(file, settings.maxFileSizeMb)) {
      fileErrors.push({
        sheet: 'ach',
        message: `File exceeds ${settings.maxFileSizeMb} MB limit.`,
      })
      setAchState({ file, data: null, errors: fileErrors })
      return
    }

    const buffer = await file.arrayBuffer()
    const parsed = parseAchWorkbook(buffer)
    setAchState({
      file,
      data: parsed.data,
      errors: parsed.errors,
    })
  }

  const handleUpload = async () => {
    if (
      !user?.id ||
      !displayState?.file ||
      !achState?.file ||
      !validation.isValid
    ) {
      return
    }

    setUploadProgress(10)
    setUploadMessage('Preparing snapshot...')

    try {
      const displayHash = await hashImportPayload(validation.storeDisplay)
      const achHash = await hashImportPayload(validation.salesAchievement)

      setUploadProgress(35)
      setUploadMessage('Uploading snapshot...')

      const result = await confirmImportMutation.mutateAsync({
        uploadedBy: user.id,
        displayFileName: displayState.file.name,
        achFileName: achState.file.name,
        displayHash,
        achHash,
        validationReport: {
          preview: validation.preview,
          uploaded_at: new Date().toISOString(),
          display_file: displayState.file.name,
          ach_file: achState.file.name,
        },
        stores: validation.stores,
        storeDisplay: validation.storeDisplay,
        salesAchievement: validation.salesAchievement,
      })

      setUploadProgress(90)

      if (!result.success) {
        await logFailedImportMutation.mutateAsync({
          uploadedBy: user.id,
          displayFileName: displayState.file.name,
          achFileName: achState.file.name,
          displayHash,
          achHash,
          validationErrors: validation.errors,
          errorLog: { message: result.message },
        })

        toast({
          variant: 'error',
          title: 'Upload failed',
          description: result.message,
        })
        return
      }

      setUploadProgress(100)
      setUploadMessage('Upload complete')

      toast({
        variant: 'success',
        title: 'Daily upload successful',
        description: 'The operational snapshot was replaced successfully.',
      })

      setDisplayState(null)
      setAchState(null)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unexpected upload error.'

      if (displayState?.file && achState?.file) {
        await logFailedImportMutation.mutateAsync({
          uploadedBy: user.id,
          displayFileName: displayState.file.name,
          achFileName: achState.file.name,
          validationErrors: validation.errors,
          errorLog: { message },
        })
      }

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Upload"
        description="Upload the Display and Sales Achievement Excel files to replace the current operational snapshot."
        icon={Upload}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <ExcelUploadCard
          title="Store Display Excel"
          description="Upload the Display worksheet with store product rows."
          file={displayState?.file ?? null}
          allowedExtensions={settings.allowedExtensions}
          errors={
            displayState?.errors.filter((error) => error.sheet === 'display') ??
            []
          }
          disabled={isUploading}
          onFileSelect={(file) => void parseAndSetDisplay(file)}
          onClear={() => setDisplayState(null)}
        />

        <ExcelUploadCard
          title="Sales Achievement Excel"
          description="Upload the ACH worksheet with store brand performance rows."
          file={achState?.file ?? null}
          allowedExtensions={settings.allowedExtensions}
          errors={
            achState?.errors.filter((error) => error.sheet === 'ach') ?? []
          }
          disabled={isUploading}
          onFileSelect={(file) => void parseAndSetAch(file)}
          onClear={() => setAchState(null)}
        />
      </div>

      <ImportPreviewPanel preview={validation.preview} />

      {validation.errors.some((error) => error.sheet === 'general') && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {validation.errors
            .filter((error) => error.sheet === 'general')
            .map((error) => error.message)
            .join(' ')}
        </div>
      )}

      {isUploading && (
        <div className="space-y-2 rounded-2xl border border-border/70 bg-background p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">
              {uploadMessage || 'Uploading...'}
            </span>
            <span className="text-muted-foreground">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} />
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Confirming the upload will completely replace the current stores,
          display, and achievement snapshot.
        </p>
        <Button
          type="button"
          disabled={!validation.isValid || isUploading}
          onClick={() => void handleUpload()}
        >
          {isUploading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="size-4" />
              Confirm Upload
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
