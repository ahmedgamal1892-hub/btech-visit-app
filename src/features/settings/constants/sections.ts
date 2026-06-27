import {
  Building2,
  FileText,
  Info,
  Palette,
  Server,
  Shield,
  SlidersHorizontal,
  Upload,
} from 'lucide-react'

import type { SettingsSectionId } from '../types/settings.types'

export type SettingsSectionDefinition = {
  id: SettingsSectionId
  label: string
  description: string
  icon: typeof Building2
}

export const SETTINGS_SECTIONS: SettingsSectionDefinition[] = [
  {
    id: 'general',
    label: 'General',
    description: 'Company profile and regional preferences',
    icon: Building2,
  },
  {
    id: 'branding',
    label: 'Branding',
    description: 'Logo, colors, and application identity',
    icon: Palette,
  },
  {
    id: 'visit',
    label: 'Visit Settings',
    description: 'Visit workflow and validation rules',
    icon: SlidersHorizontal,
  },
  {
    id: 'upload',
    label: 'Upload Settings',
    description: 'Excel imports and snapshot configuration',
    icon: Upload,
  },
  {
    id: 'pdf',
    label: 'PDF Settings',
    description: 'Report layout and export options',
    icon: FileText,
  },
  {
    id: 'security',
    label: 'Security',
    description: 'Authentication and access policies',
    icon: Shield,
  },
  {
    id: 'system',
    label: 'System Information',
    description: 'Runtime status and infrastructure',
    icon: Server,
  },
  {
    id: 'about',
    label: 'About',
    description: 'Application details and support',
    icon: Info,
  },
]
