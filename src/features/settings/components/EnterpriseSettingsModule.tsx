import { Settings } from 'lucide-react'

import { AlertBanner, PageHeader } from '@/components/common'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { SETTINGS_SECTIONS } from '../constants/sections'
import { useEnterpriseSettings, useSettingsPageData } from '../hooks'
import { SettingsPageSkeleton } from './SettingsPageSkeleton'
import { AboutSettingsSection } from './sections/AboutSettingsSection'
import { BrandingSettingsSection } from './sections/BrandingSettingsSection'
import { GeneralSettingsSection } from './sections/GeneralSettingsSection'
import { PdfSettingsSection } from './sections/PdfSettingsSection'
import { SecuritySettingsSection } from './sections/SecuritySettingsSection'
import { SystemInfoSection } from './sections/SystemInfoSection'
import { UploadSettingsSection } from './sections/UploadSettingsSection'
import { VisitSettingsSection } from './sections/VisitSettingsSection'

export function EnterpriseSettingsModule() {
  const pageData = useSettingsPageData()
  const {
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
  } = useEnterpriseSettings()

  if (pageData.isLoading) {
    return <SettingsPageSkeleton />
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Configure enterprise preferences, branding, visit rules, uploads, PDF exports, and system information."
        icon={Settings}
      />

      {!pageData.connection.isConnected && pageData.connection.errorMessage ? (
        <AlertBanner variant="warning" title="Limited live data">
          Some system and upload values may show defaults until Supabase is
          connected. {pageData.connection.errorMessage}
        </AlertBanner>
      ) : null}

      <Tabs
        value={activeSection}
        onValueChange={(value) =>
          setActiveSection(value as typeof activeSection)
        }
        className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start"
      >
        <div className="lg:sticky lg:top-24">
          <TabsList className="w-full overflow-x-auto lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
            {SETTINGS_SECTIONS.map((section) => (
              <TabsTrigger
                key={section.id}
                value={section.id}
                className="w-full justify-start"
              >
                <section.icon className="size-4 shrink-0" />
                <span>{section.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="min-w-0">
          <TabsContent value="general">
            <GeneralSettingsSection
              values={settings.general}
              isSaving={isSaving}
              onChange={updateGeneral}
              onSave={() => void saveSection('general')}
              onReset={() => resetSection('general')}
            />
          </TabsContent>

          <TabsContent value="branding">
            <BrandingSettingsSection general={settings.general} />
          </TabsContent>

          <TabsContent value="visit">
            <VisitSettingsSection
              values={settings.visit}
              isSaving={isSaving}
              onChange={updateVisit}
              onSave={() => void saveSection('visit')}
              onReset={() => resetSection('visit')}
            />
          </TabsContent>

          <TabsContent value="upload">
            <UploadSettingsSection
              allowedFileTypes={pageData.uploadDisplay.allowedFileTypes}
              maxExcelSizeMb={pageData.uploadDisplay.maxExcelSizeMb}
              maxImageSizeMb={pageData.uploadDisplay.maxImageSizeMb}
              currentSnapshotStatus={
                pageData.uploadDisplay.currentSnapshotStatus
              }
              lastUploadDate={pageData.uploadDisplay.lastUploadDate}
              isLoading={pageData.isImportSettingsLoading}
            />
          </TabsContent>

          <TabsContent value="pdf">
            <PdfSettingsSection
              values={settings.pdf}
              logoPath={pageData.appMeta.logoPath}
              isSaving={isSaving}
              onChange={updatePdf}
              onSave={() => void saveSection('pdf')}
              onReset={() => resetSection('pdf')}
            />
          </TabsContent>

          <TabsContent value="security">
            <SecuritySettingsSection
              values={settings.security}
              isSaving={isSaving}
              onChange={updateSecurity}
              onSave={() => void saveSection('security')}
              onReset={() => resetSection('security')}
            />
          </TabsContent>

          <TabsContent value="system">
            <SystemInfoSection
              applicationVersion={pageData.appMeta.version}
              buildVersion={pageData.appMeta.buildVersion}
              environment={pageData.appMeta.environment}
              supabaseConnection={pageData.systemDisplay.supabaseConnection}
              databaseStatus={pageData.systemDisplay.databaseStatus}
              lastSnapshotDate={pageData.systemDisplay.lastSnapshotDate}
              lastDeploymentDate={pageData.systemDisplay.lastDeploymentDate}
              currentUserRole={pageData.systemDisplay.currentUserRole}
              isLoading={pageData.isConnectionLoading}
              isConnected={pageData.connection.isConnected}
              connectionError={pageData.connection.errorMessage}
            />
          </TabsContent>

          <TabsContent value="about">
            <AboutSettingsSection
              applicationVersion={pageData.appMeta.version}
              supportEmail={settings.general.companyEmail}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
