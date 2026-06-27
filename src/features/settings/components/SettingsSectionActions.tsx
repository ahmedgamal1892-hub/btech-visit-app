import { Loader2, RotateCcw, Save } from 'lucide-react'

import { PrimaryButton, SecondaryButton } from '@/components/ui/action-buttons'

type SettingsSectionActionsProps = {
  isSaving?: boolean
  onSave: () => void
  onReset?: () => void
  saveLabel?: string
}

export function SettingsSectionActions({
  isSaving = false,
  onSave,
  onReset,
  saveLabel = 'Save Changes',
}: SettingsSectionActionsProps) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      {onReset ? (
        <SecondaryButton type="button" disabled={isSaving} onClick={onReset}>
          <RotateCcw className="size-4" />
          Reset Defaults
        </SecondaryButton>
      ) : null}
      <PrimaryButton type="button" disabled={isSaving} onClick={onSave}>
        {isSaving ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="size-4" />
            {saveLabel}
          </>
        )}
      </PrimaryButton>
    </div>
  )
}
