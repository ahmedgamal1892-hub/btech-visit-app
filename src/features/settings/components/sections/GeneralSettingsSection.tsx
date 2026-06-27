import { Globe2, Languages, MapPin, Phone, Tag } from 'lucide-react'

import { FormField } from '@/components/common'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { APP_VERSION } from '@/lib/constants/app-meta'

import type { GeneralSettings } from '../../types/settings.types'
import { SettingsInfoRow } from '../SettingsInfoRow'
import { SettingsSectionActions } from '../SettingsSectionActions'
import { SettingsSectionCard } from '../SettingsSectionCard'

type GeneralSettingsSectionProps = {
  values: GeneralSettings
  isSaving: boolean
  onChange: (values: Partial<GeneralSettings>) => void
  onSave: () => void
  onReset: () => void
}

export function GeneralSettingsSection({
  values,
  isSaving,
  onChange,
  onSave,
  onReset,
}: GeneralSettingsSectionProps) {
  return (
    <div className="space-y-6">
      <SettingsSectionCard
        title="Company Profile"
        description="Organization details used across the application experience."
        icon={Globe2}
        footer={
          <SettingsSectionActions
            isSaving={isSaving}
            onSave={onSave}
            onReset={onReset}
          />
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Company Name" htmlFor="settings-company-name">
            <Input
              id="settings-company-name"
              value={values.companyName}
              onChange={(event) =>
                onChange({ companyName: event.target.value })
              }
            />
          </FormField>
          <FormField label="Application Name" htmlFor="settings-app-name">
            <Input
              id="settings-app-name"
              value={values.applicationName}
              onChange={(event) =>
                onChange({ applicationName: event.target.value })
              }
            />
          </FormField>
          <FormField label="Company Email" htmlFor="settings-company-email">
            <Input
              id="settings-company-email"
              type="email"
              value={values.companyEmail}
              onChange={(event) =>
                onChange({ companyEmail: event.target.value })
              }
            />
          </FormField>
          <FormField label="Company Phone" htmlFor="settings-company-phone">
            <Input
              id="settings-company-phone"
              type="tel"
              value={values.companyPhone}
              onChange={(event) =>
                onChange({ companyPhone: event.target.value })
              }
            />
          </FormField>
        </div>
        <FormField label="Company Address" htmlFor="settings-company-address">
          <Input
            id="settings-company-address"
            value={values.companyAddress}
            onChange={(event) =>
              onChange({ companyAddress: event.target.value })
            }
          />
        </FormField>
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Regional Preferences"
        description="Formatting and localization defaults for the workspace."
        icon={Languages}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <FormField label="Time Zone" htmlFor="settings-timezone">
            <Select
              id="settings-timezone"
              value={values.timeZone}
              onChange={(event) => onChange({ timeZone: event.target.value })}
            >
              <option value="Africa/Cairo">Africa/Cairo (GMT+2)</option>
              <option value="UTC">UTC</option>
              <option value="Europe/London">Europe/London</option>
            </Select>
          </FormField>
          <FormField label="Date Format" htmlFor="settings-date-format">
            <Select
              id="settings-date-format"
              value={values.dateFormat}
              onChange={(event) => onChange({ dateFormat: event.target.value })}
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </Select>
          </FormField>
          <FormField label="Language" htmlFor="settings-language">
            <Select
              id="settings-language"
              value={values.language}
              onChange={(event) => onChange({ language: event.target.value })}
            >
              <option value="English">English</option>
            </Select>
          </FormField>
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Application Version"
        description="Current release information for this deployment."
        icon={Tag}
      >
        <SettingsInfoRow
          label="Version"
          value={<Badge variant="secondary">v{APP_VERSION}</Badge>}
        />
        <SettingsInfoRow
          label="Primary Contact"
          value={values.companyEmail}
          hint="Used for support and operational notifications."
        />
        <SettingsInfoRow label="Phone" value={values.companyPhone} />
        <SettingsInfoRow label="Address" value={values.companyAddress} />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="size-3.5" />
          <Phone className="size-3.5" />
          <span>
            Contact details are displayed for administrator reference.
          </span>
        </div>
      </SettingsSectionCard>
    </div>
  )
}
