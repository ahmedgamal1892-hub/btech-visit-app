import { HeartHandshake, Info, Mail, Sparkles } from 'lucide-react'

import { AppBrand } from '@/components/branding'
import { Badge } from '@/components/ui/badge'
import { APP_NAME } from '@/lib/constants/branding'

import { ABOUT_SETTINGS } from '../../constants/defaults'
import { SettingsInfoRow } from '../SettingsInfoRow'
import { SettingsSectionCard } from '../SettingsSectionCard'

type AboutSettingsSectionProps = {
  applicationVersion: string
  supportEmail: string
}

export function AboutSettingsSection({
  applicationVersion,
  supportEmail,
}: AboutSettingsSectionProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 via-background to-background p-6 shadow-md">
        <AppBrand showTagline centered className="justify-center" />
        <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-muted-foreground">
          Enterprise visit management platform for BTECH store operations,
          inspections, uploads, and reporting.
        </p>
      </div>

      <SettingsSectionCard
        title="Application"
        description="Official product information."
        icon={Info}
      >
        <SettingsInfoRow label="Application" value={APP_NAME} />
        <SettingsInfoRow
          label="Version"
          value={<Badge variant="secondary">v{applicationVersion}</Badge>}
        />
        <SettingsInfoRow label="Developer" value={ABOUT_SETTINGS.developer} />
        <SettingsInfoRow label="Copyright" value={ABOUT_SETTINGS.copyright} />
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Support"
        description="Contact channels for administrators."
        icon={HeartHandshake}
      >
        <SettingsInfoRow
          label="Support Email"
          value={
            <a
              href={`mailto:${supportEmail}`}
              className="font-medium text-primary hover:underline"
            >
              {supportEmail}
            </a>
          }
        />
        <SettingsInfoRow label="Tagline" value={ABOUT_SETTINGS.tagline} />
        <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
          <Mail className="size-4 text-primary" />
          <Sparkles className="size-4 text-primary" />
          Built for reliable field visit operations at enterprise scale.
        </div>
      </SettingsSectionCard>
    </div>
  )
}
