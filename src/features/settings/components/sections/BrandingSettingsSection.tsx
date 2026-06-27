import { ImageIcon, Palette, Sparkles } from 'lucide-react'

import { AppLogo } from '@/components/branding'
import { FormField } from '@/components/common'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  APP_NAME,
  APP_TAGLINE,
  BRAND_COLORS,
  LOGO_PATH,
} from '@/lib/constants/branding'

import type { GeneralSettings } from '../../types/settings.types'
import { SettingsInfoRow } from '../SettingsInfoRow'
import { SettingsSectionCard } from '../SettingsSectionCard'

type BrandingSettingsSectionProps = {
  general: GeneralSettings
}

const COLOR_SWATCHES = [
  { label: 'Primary Orange', value: BRAND_COLORS.primary },
  { label: 'Dark Navy', value: BRAND_COLORS.dark },
  { label: 'Light Gray', value: BRAND_COLORS.background },
  { label: 'Border Gray', value: BRAND_COLORS.border },
  { label: 'Success Green', value: BRAND_COLORS.success },
  { label: 'Error Red', value: BRAND_COLORS.danger },
] as const

export function BrandingSettingsSection({
  general,
}: BrandingSettingsSectionProps) {
  return (
    <div className="space-y-6">
      <SettingsSectionCard
        title="Company Logo"
        description="Official BTECH logo used across the application."
        icon={ImageIcon}
      >
        <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed border-border bg-muted/20 p-5 sm:flex-row sm:items-center">
          <div className="flex size-20 items-center justify-center rounded-xl border border-border bg-white p-2 shadow-sm">
            <AppLogo size="lg" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-medium text-foreground">
              Current BTECH Logo
            </p>
            <p className="text-xs text-muted-foreground">
              Logo replacement will be enabled through this panel once backend
              asset management is connected. Update only{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                public/logo.png
              </code>{' '}
              today to change branding globally.
            </p>
            <Badge variant="secondary">Source: {LOGO_PATH}</Badge>
          </div>
        </div>

        <FormField
          label="Replace Logo"
          htmlFor="settings-logo-upload"
          hint="Prepared for future upload integration. File selection is disabled."
        >
          <Input
            id="settings-logo-upload"
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            disabled
          />
        </FormField>
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Brand Identity"
        description="Application naming and visual identity tokens."
        icon={Sparkles}
      >
        <SettingsInfoRow label="Application Name" value={APP_NAME} />
        <SettingsInfoRow
          label="Display Name Override"
          value={general.applicationName}
        />
        <SettingsInfoRow label="Company Name" value={general.companyName} />
        <SettingsInfoRow label="Tagline" value={APP_TAGLINE} />
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Company Colors"
        description="BTECH palette applied through centralized theme tokens."
        icon={Palette}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {COLOR_SWATCHES.map((color) => (
            <div
              key={color.label}
              className="flex items-center gap-3 rounded-xl border border-border/70 bg-background px-3 py-3"
            >
              <span
                className="size-10 shrink-0 rounded-lg border border-border shadow-sm"
                style={{ backgroundColor: color.value }}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {color.label}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {color.value}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Colors are managed in theme constants and can be connected to dynamic
          settings later without changing UI components.
        </p>
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Preview"
        description="How branding appears in the shell."
      >
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <AppLogo size="md" />
          <div>
            <Label className="text-base">{general.applicationName}</Label>
            <p className="text-sm text-muted-foreground">{APP_TAGLINE}</p>
          </div>
        </div>
      </SettingsSectionCard>
    </div>
  )
}
