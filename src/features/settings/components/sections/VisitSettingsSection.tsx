import {
  Camera,
  ClipboardList,
  FileText,
  ShieldCheck,
  Trash2,
} from 'lucide-react'

import { FormField } from '@/components/common'
import { Input } from '@/components/ui/input'

import type { VisitSettings } from '../../types/settings.types'
import { SettingsSectionActions } from '../SettingsSectionActions'
import { SettingsSectionCard } from '../SettingsSectionCard'
import { SettingsToggleRow } from '../SettingsToggleRow'

type VisitSettingsSectionProps = {
  values: VisitSettings
  isSaving: boolean
  onChange: (values: Partial<VisitSettings>) => void
  onSave: () => void
  onReset: () => void
}

export function VisitSettingsSection({
  values,
  isSaving,
  onChange,
  onSave,
  onReset,
}: VisitSettingsSectionProps) {
  return (
    <div className="space-y-6">
      <SettingsSectionCard
        title="Visit Workflow"
        description="Control how visits are created, edited, and removed."
        icon={ClipboardList}
        footer={
          <SettingsSectionActions
            isSaving={isSaving}
            onSave={onSave}
            onReset={onReset}
          />
        }
      >
        <SettingsToggleRow
          id="allow-draft-visits"
          label="Allow Draft Visits"
          description="Enable draft visit creation before final submission."
          checked={values.allowDraftVisits}
          onCheckedChange={(checked) => onChange({ allowDraftVisits: checked })}
        />
        <SettingsToggleRow
          id="allow-visit-editing"
          label="Allow Visit Editing"
          description="Permit updates to submitted visit records where authorized."
          checked={values.allowVisitEditing}
          onCheckedChange={(checked) =>
            onChange({ allowVisitEditing: checked })
          }
        />
        <SettingsToggleRow
          id="allow-visit-deletion"
          label="Allow Visit Deletion"
          description="Enable role-based permanent visit deletion."
          checked={values.allowVisitDeletion}
          onCheckedChange={(checked) =>
            onChange({ allowVisitDeletion: checked })
          }
        />
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Validation Rules"
        description="Required content and limits for visit submissions."
        icon={ShieldCheck}
      >
        <SettingsToggleRow
          id="require-notes"
          label="Require Notes"
          description="Make general notes mandatory before submitting a visit."
          checked={values.requireNotes}
          onCheckedChange={(checked) => onChange({ requireNotes: checked })}
        />
        <SettingsToggleRow
          id="require-photos"
          label="Require Photos"
          description="Require at least one photo attachment per visit."
          checked={values.requirePhotos}
          onCheckedChange={(checked) => onChange({ requirePhotos: checked })}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Maximum Photos Per Visit"
            htmlFor="max-photos"
            hint="Upper limit for uploaded visit photos."
          >
            <Input
              id="max-photos"
              type="number"
              min={1}
              max={100}
              value={values.maxPhotosPerVisit}
              onChange={(event) =>
                onChange({
                  maxPhotosPerVisit: Number(event.target.value) || 1,
                })
              }
            />
          </FormField>
          <FormField
            label="Maximum Note Length"
            htmlFor="max-note-length"
            hint="Character limit for general visit notes."
          >
            <Input
              id="max-note-length"
              type="number"
              min={100}
              max={10000}
              value={values.maxNoteLength}
              onChange={(event) =>
                onChange({
                  maxNoteLength: Number(event.target.value) || 100,
                })
              }
            />
          </FormField>
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Policy Summary"
        description="Quick overview of the configured visit behavior."
        icon={FileText}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <SummaryTile
            icon={ClipboardList}
            label="Draft Visits"
            enabled={values.allowDraftVisits}
          />
          <SummaryTile
            icon={Camera}
            label="Photo Requirement"
            enabled={values.requirePhotos}
          />
          <SummaryTile
            icon={Trash2}
            label="Deletion"
            enabled={values.allowVisitDeletion}
          />
          <SummaryTile
            icon={FileText}
            label="Notes Requirement"
            enabled={values.requireNotes}
          />
        </div>
      </SettingsSectionCard>
    </div>
  )
}

function SummaryTile({
  icon: Icon,
  label,
  enabled,
}: {
  icon: typeof Camera
  label: string
  enabled: boolean
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <p className="text-sm font-medium">{label}</p>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {enabled ? 'Enabled' : 'Disabled'}
      </p>
    </div>
  )
}
