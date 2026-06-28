import { FileSpreadsheet, Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { ImportValidationError } from '@/types/import'

type ExcelUploadCardProps = {
  title: string
  description: string
  file: File | null
  allowedExtensions: string[]
  errors: ImportValidationError[]
  disabled?: boolean
  uploadButtonLabel?: string
  onFileSelect: (file: File) => void
  onClear: () => void
}

export function ExcelUploadCard({
  title,
  description,
  file,
  allowedExtensions,
  errors,
  disabled = false,
  uploadButtonLabel = 'Choose File',
  onFileSelect,
  onClear,
}: ExcelUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const accept = allowedExtensions.map((ext) => `.${ext}`).join(',')

  const handleFiles = (files: FileList | null) => {
    const selected = files?.[0]
    if (selected) {
      onFileSelect(selected)
    }
  }

  return (
    <Card className="rounded-2xl border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="size-5 text-accent" aria-hidden="true" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              inputRef.current?.click()
            }
          }}
          onDragEnter={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={(event) => {
            event.preventDefault()
            setIsDragging(false)
          }}
          onDrop={(event) => {
            event.preventDefault()
            setIsDragging(false)
            if (!disabled) {
              handleFiles(event.dataTransfer.files)
            }
          }}
          className={cn(
            'rounded-2xl border border-dashed px-4 py-8 text-center transition-colors',
            isDragging
              ? 'border-accent bg-accent/5'
              : 'border-border/70 bg-muted/20',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          <Upload className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-foreground">
            Drag and drop your Excel file here
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Accepted formats: {allowedExtensions.join(', ')}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            {uploadButtonLabel}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            disabled={disabled}
            onChange={(event) => handleFiles(event.target.files)}
          />
        </div>

        {file && (
          <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {file.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={disabled}
              onClick={onClear}
              aria-label={`Remove ${file.name}`}
            >
              <X className="size-4" />
            </Button>
          </div>
        )}

        {errors.length > 0 && (
          <div
            role="alert"
            className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-3"
          >
            {errors.slice(0, 8).map((error, index) => (
              <p
                key={`${error.message}-${index}`}
                className="text-sm text-destructive"
              >
                {error.row
                  ? `Row ${error.row}${error.column ? ` · ${error.column}` : ''}: ${error.message}`
                  : error.message}
              </p>
            ))}
            {errors.length > 8 && (
              <p className="text-sm text-destructive">
                +{errors.length - 8} more validation errors
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
