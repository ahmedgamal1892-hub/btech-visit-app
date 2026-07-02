import { useState } from 'react'

import {
  getNotesAsHtml,
  getNotesAsPlainText,
  NotesDebugPreview,
  RichTextNotesEditor,
  type NotesContent,
} from '@/components/editor'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'

type GeneralNotesCardProps = {
  value: string
  onChange: (value: string) => void
}

export function GeneralNotesCard({ value, onChange }: GeneralNotesCardProps) {
  const [notesHtml, setNotesHtml] = useState('')

  function handleNotesChange(content: NotesContent) {
    setNotesHtml(getNotesAsHtml(content))
    onChange(getNotesAsPlainText(content))
  }

  return (
    <Card className="rounded-2xl border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>General Notes</CardTitle>
        <CardDescription>
          Add visit-level notes that apply to the entire branch visit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Label htmlFor="general-notes">Notes</Label>
        <RichTextNotesEditor
          id="general-notes"
          plainText={value}
          html={notesHtml}
          placeholder="Enter general visit notes..."
          onChange={handleNotesChange}
        />
        <NotesDebugPreview
          label="General Notes"
          html={notesHtml}
          plainText={value}
        />
      </CardContent>
    </Card>
  )
}
