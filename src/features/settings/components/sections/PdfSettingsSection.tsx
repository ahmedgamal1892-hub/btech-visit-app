import { FileImage, FileText, LayoutTemplate } from 'lucide-react'

import { AppLogo } from '@/components/branding'
import { FormField } from '@/components/common'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

import type { PdfSettings } from '../../types/settings.types'
import { SettingsInfoRow } from '../SettingsInfoRow'
import { SettingsSectionActions } from '../SettingsSectionActions'
import { SettingsSectionCard } from '../SettingsSectionCard'

type PdfSettingsSectionProps = {
  values: PdfSettings
  logoPath: string
  isSaving: boolean
  onChange: (values: Partial<PdfSettings>) => void
  onSave: () => void
  onReset: () => void
}

export function PdfSettingsSection({
  values,
  logoPath,
  isSaving,
  onChange,
  onSave,
  onReset,
}: PdfSettingsSectionProps) {
  return (
    <div className="space-y-6">
      <SettingsSectionCard
        title="PDF Branding"
        description="Header and footer content for exported visit reports."
        icon={LayoutTemplate}
        footer={
          <SettingsSectionActions
            isSaving={isSaving}
            onSave={onSave}
            onReset={onReset}
          />
        }
      >
        <div className="flex items-center gap-4 rounded-xl border border-border/70 bg-muted/20 p-4">
          <AppLogo />
          <div>
            <p className="text-sm font-medium">Company Logo</p>
            <p className="text-xs text-muted-foreground">{logoPath}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Header Title" htmlFor="pdf-header-title">
            <Input
              id="pdf-header-title"
              value={values.headerTitle}
              onChange={(event) =>
                onChange({ headerTitle: event.target.value })
              }
            />
          </FormField>
          <FormField label="Footer Text" htmlFor="pdf-footer-text">
            <Input
              id="pdf-footer-text"
              value={values.footerText}
              onChange={(event) => onChange({ footerText: event.target.value })}
            />
          </FormField>
          <FormField label="Paper Size" htmlFor="pdf-paper-size">
            <Select
              id="pdf-paper-size"
              value={values.paperSize}
              onChange={(event) => onChange({ paperSize: event.target.value })}
            >
              <option value="A4">A4</option>
              <option value="Letter">Letter</option>
            </Select>
          </FormField>
          <FormField label="Orientation" htmlFor="pdf-orientation">
            <Select
              id="pdf-orientation"
              value={values.orientation}
              onChange={(event) =>
                onChange({ orientation: event.target.value })
              }
            >
              <option value="Portrait">Portrait</option>
              <option value="Landscape">Landscape</option>
            </Select>
          </FormField>
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard
        title="PDF Content Sections"
        description="Choose which sections appear in exported reports."
        icon={FileText}
      >
        <PdfToggle
          id="pdf-show-photos"
          label="Show Photos"
          checked={values.showPhotos}
          onCheckedChange={(checked) => onChange({ showPhotos: checked })}
        />
        <PdfToggle
          id="pdf-show-product-status"
          label="Show Product Status"
          checked={values.showProductStatus}
          onCheckedChange={(checked) =>
            onChange({ showProductStatus: checked })
          }
        />
        <PdfToggle
          id="pdf-show-notes"
          label="Show Notes"
          checked={values.showNotes}
          onCheckedChange={(checked) => onChange({ showNotes: checked })}
        />
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Export Preview"
        description="Summary of the current PDF configuration."
        icon={FileImage}
      >
        <SettingsInfoRow label="Header Title" value={values.headerTitle} />
        <SettingsInfoRow label="Footer Text" value={values.footerText} />
        <SettingsInfoRow
          label="Layout"
          value={
            <Badge variant="secondary">
              {values.paperSize} · {values.orientation}
            </Badge>
          }
        />
      </SettingsSectionCard>
    </div>
  )
}

function PdfToggle({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
      <Label htmlFor={id}>{label}</Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}
