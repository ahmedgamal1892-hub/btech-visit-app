import { Activity, Database, Server, UserCircle2 } from 'lucide-react'

import { AlertBanner, LoadingIndicator } from '@/components/common'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

import { SettingsInfoRow } from '../SettingsInfoRow'
import { SettingsSectionCard } from '../SettingsSectionCard'

type SystemInfoSectionProps = {
  applicationVersion: string
  buildVersion: string
  environment: string
  supabaseConnection: string
  databaseStatus: string
  lastSnapshotDate: string
  lastDeploymentDate: string
  currentUserRole: string
  isLoading: boolean
  isConnected: boolean
  connectionError?: string | null
}

export function SystemInfoSection({
  applicationVersion,
  buildVersion,
  environment,
  supabaseConnection,
  databaseStatus,
  lastSnapshotDate,
  lastDeploymentDate,
  currentUserRole,
  isLoading,
  isConnected,
  connectionError,
}: SystemInfoSectionProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <LoadingIndicator message="Loading system information..." centered />
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-44 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {!isConnected && connectionError ? (
        <AlertBanner variant="warning" title="Supabase connection issue">
          {connectionError}
        </AlertBanner>
      ) : null}

      <SettingsSectionCard
        title="Application Runtime"
        description="Build and deployment metadata."
        icon={Server}
      >
        <SettingsInfoRow
          label="Application Version"
          value={<Badge variant="secondary">v{applicationVersion}</Badge>}
        />
        <SettingsInfoRow label="Build Version" value={buildVersion} />
        <SettingsInfoRow
          label="Environment"
          value={
            <Badge
              variant={environment === 'production' ? 'success' : 'warning'}
            >
              {environment}
            </Badge>
          }
        />
        <SettingsInfoRow
          label="Last Deployment Date"
          value={lastDeploymentDate}
        />
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Infrastructure Status"
        description="Live connectivity and database health indicators."
        icon={Database}
      >
        <SettingsInfoRow
          label="Supabase Connection"
          value={
            <Badge variant={isConnected ? 'success' : 'destructive'}>
              {supabaseConnection}
            </Badge>
          }
        />
        <SettingsInfoRow
          label="Database Status"
          value={
            <Badge
              variant={
                databaseStatus === 'Operational' ? 'success' : 'destructive'
              }
            >
              {databaseStatus}
            </Badge>
          }
        />
        <SettingsInfoRow label="Last Snapshot Date" value={lastSnapshotDate} />
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Access Context"
        description="Current administrator session details."
        icon={UserCircle2}
      >
        <SettingsInfoRow
          label="Current User Role"
          value={<Badge>{currentUserRole}</Badge>}
        />
        <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
          <Activity className="size-4 text-primary" />
          System information is read-only and reflects live application state.
        </div>
      </SettingsSectionCard>
    </div>
  )
}
