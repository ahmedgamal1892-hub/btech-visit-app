import { useCallback, useState } from 'react'

import { useToast } from '@/components/ui/toast'

import { ENTERPRISE_SETTINGS_DEFAULTS } from '../constants/defaults'
import type {
  EnterpriseSettingsState,
  GeneralSettings,
  PdfSettings,
  SecuritySettings,
  SettingsSectionId,
  VisitSettings,
} from '../types/settings.types'

const SECTION_LABELS: Record<SettingsSectionId, string> = {
  general: 'General',
  branding: 'Branding',
  visit: 'Visit Settings',
  upload: 'Upload Settings',
  pdf: 'PDF Settings',
  security: 'Security',
  system: 'System Information',
  about: 'About',
}

export function useEnterpriseSettings() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<EnterpriseSettingsState>(
    ENTERPRISE_SETTINGS_DEFAULTS,
  )
  const [activeSection, setActiveSection] =
    useState<SettingsSectionId>('general')
  const [isSaving, setIsSaving] = useState(false)

  const updateGeneral = useCallback((values: Partial<GeneralSettings>) => {
    setSettings((current) => ({
      ...current,
      general: { ...current.general, ...values },
    }))
  }, [])

  const updateVisit = useCallback((values: Partial<VisitSettings>) => {
    setSettings((current) => ({
      ...current,
      visit: { ...current.visit, ...values },
    }))
  }, [])

  const updatePdf = useCallback((values: Partial<PdfSettings>) => {
    setSettings((current) => ({
      ...current,
      pdf: { ...current.pdf, ...values },
    }))
  }, [])

  const updateSecurity = useCallback((values: Partial<SecuritySettings>) => {
    setSettings((current) => ({
      ...current,
      security: { ...current.security, ...values },
    }))
  }, [])

  const saveSection = useCallback(
    async (section: SettingsSectionId) => {
      setIsSaving(true)

      await new Promise((resolve) => {
        window.setTimeout(resolve, 450)
      })

      setIsSaving(false)
      toast({
        variant: 'success',
        title: `${SECTION_LABELS[section]} saved`,
        description:
          'Changes are stored in the current session and ready for backend integration.',
      })
    },
    [toast],
  )

  const resetSection = useCallback((section: SettingsSectionId) => {
    if (section === 'general') {
      setSettings((current) => ({
        ...current,
        general: ENTERPRISE_SETTINGS_DEFAULTS.general,
      }))
      return
    }

    if (section === 'visit') {
      setSettings((current) => ({
        ...current,
        visit: ENTERPRISE_SETTINGS_DEFAULTS.visit,
      }))
      return
    }

    if (section === 'pdf') {
      setSettings((current) => ({
        ...current,
        pdf: ENTERPRISE_SETTINGS_DEFAULTS.pdf,
      }))
      return
    }

    if (section === 'security') {
      setSettings((current) => ({
        ...current,
        security: ENTERPRISE_SETTINGS_DEFAULTS.security,
      }))
    }
  }, [])

  return {
    settings,
    activeSection,
    setActiveSection,
    isSaving,
    updateGeneral,
    updateVisit,
    updatePdf,
    updateSecurity,
    saveSection,
    resetSection,
  }
}
