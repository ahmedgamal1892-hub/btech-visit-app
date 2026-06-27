import { KeyRound, Lock, Shield, Timer } from 'lucide-react'

import { FormField } from '@/components/common'
import { Input } from '@/components/ui/input'

import type { SecuritySettings } from '../../types/settings.types'
import { SettingsInfoRow } from '../SettingsInfoRow'
import { SettingsSectionActions } from '../SettingsSectionActions'
import { SettingsSectionCard } from '../SettingsSectionCard'

type SecuritySettingsSectionProps = {
  values: SecuritySettings
  isSaving: boolean
  onChange: (values: Partial<SecuritySettings>) => void
  onSave: () => void
  onReset: () => void
}

export function SecuritySettingsSection({
  values,
  isSaving,
  onChange,
  onSave,
  onReset,
}: SecuritySettingsSectionProps) {
  return (
    <div className="space-y-6">
      <SettingsSectionCard
        title="Password Policy"
        description="Authentication strength requirements for user accounts."
        icon={Lock}
        footer={
          <SettingsSectionActions
            isSaving={isSaving}
            onSave={onSave}
            onReset={onReset}
          />
        }
      >
        <SettingsInfoRow label="Policy" value={values.passwordPolicy} />
        <FormField
          label="Minimum Password Length"
          htmlFor="security-min-password"
          hint="Recommended minimum for enterprise accounts."
        >
          <Input
            id="security-min-password"
            type="number"
            min={6}
            max={128}
            value={values.minimumPasswordLength}
            onChange={(event) =>
              onChange({
                minimumPasswordLength: Number(event.target.value) || 8,
              })
            }
          />
        </FormField>
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Session Controls"
        description="Access timeout and login protection settings."
        icon={Timer}
      >
        <FormField
          label="Session Timeout (minutes)"
          htmlFor="security-session-timeout"
        >
          <Input
            id="security-session-timeout"
            type="number"
            min={15}
            max={1440}
            value={values.sessionTimeoutMinutes}
            onChange={(event) =>
              onChange({
                sessionTimeoutMinutes: Number(event.target.value) || 60,
              })
            }
          />
        </FormField>
        <FormField
          label="Maximum Login Attempts"
          htmlFor="security-login-attempts"
        >
          <Input
            id="security-login-attempts"
            type="number"
            min={3}
            max={20}
            value={values.maximumLoginAttempts}
            onChange={(event) =>
              onChange({
                maximumLoginAttempts: Number(event.target.value) || 5,
              })
            }
          />
        </FormField>
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Security Overview"
        description="At-a-glance policy summary."
        icon={Shield}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard
            icon={KeyRound}
            label="Min Password"
            value={`${values.minimumPasswordLength} chars`}
          />
          <MetricCard
            icon={Timer}
            label="Session Timeout"
            value={`${values.sessionTimeoutMinutes} min`}
          />
          <MetricCard
            icon={Shield}
            label="Login Attempts"
            value={String(values.maximumLoginAttempts)}
          />
        </div>
      </SettingsSectionCard>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Shield
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
      <Icon className="size-4 text-primary" />
      <p className="mt-2 text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}
