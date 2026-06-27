import { Database, FileSpreadsheet, Image, UploadCloud } from 'lucide-react'

import { AlertBanner } from '@/components/common'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

import { SettingsInfoRow } from '../SettingsInfoRow'
import { SettingsSectionCard } from '../SettingsSectionCard'

type UploadSettingsSectionProps = {
  allowedFileTypes: string[]
  maxExcelSizeMb: number
  maxImageSizeMb: number
  currentSnapshotStatus: string
  lastUploadDate: string
  isLoading: boolean
  isError?: boolean
}

export function UploadSettingsSection({
  allowedFileTypes,
  maxExcelSizeMb,
  maxImageSizeMb,
  currentSnapshotStatus,
  lastUploadDate,
  isLoading,
  isError = false,
}: UploadSettingsSectionProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {isError ? (
        <AlertBanner variant="error" title="Unable to load upload settings">
          Showing default upload configuration values.
        </AlertBanner>
      ) : null}

      <SettingsSectionCard
        title="Excel Import Configuration"
        description="Rules applied to daily snapshot uploads."
        icon={FileSpreadsheet}
      >
        <SettingsInfoRow
          label="Allowed File Types"
          value={
            <div className="flex flex-wrap justify-end gap-1.5">
              {allowedFileTypes.map((ext) => (
                <Badge key={ext} variant="secondary">
                  .{ext}
                </Badge>
              ))}
            </div>
          }
        />
        <SettingsInfoRow
          label="Maximum Excel Size"
          value={`${maxExcelSizeMb} MB`}
          hint="Loaded from current application settings."
        />
        <SettingsInfoRow
          label="Maximum Image Size"
          value={`${maxImageSizeMb} MB`}
          hint="Applied to visit photo uploads."
        />
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Snapshot Status"
        description="Operational state of the current data snapshot."
        icon={Database}
      >
        <SettingsInfoRow
          label="Current Snapshot Status"
          value={
            <Badge
              variant={currentSnapshotStatus === '—' ? 'secondary' : 'success'}
            >
              {currentSnapshotStatus}
            </Badge>
          }
        />
        <SettingsInfoRow
          label="Last Upload Date"
          value={lastUploadDate}
          hint="Most recent confirmed import batch."
        />
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Upload Channels"
        description="Supported import and media pathways."
        icon={UploadCloud}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <ChannelCard
            icon={FileSpreadsheet}
            title="Daily Excel Upload"
            description="Display and Sales Achievement worksheets."
          />
          <ChannelCard
            icon={Image}
            title="Visit Photos"
            description="Image attachments captured during visits."
          />
        </div>
      </SettingsSectionCard>
    </div>
  )
}

function ChannelCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof UploadCloud
  title: string
  description: string
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <p className="text-sm font-medium">{title}</p>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{description}</p>
    </div>
  )
}
