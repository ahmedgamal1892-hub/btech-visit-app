import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type GeneralNotesCardProps = {
  value: string
  onChange: (value: string) => void
}

export function GeneralNotesCard({ value, onChange }: GeneralNotesCardProps) {
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
        <Textarea
          id="general-notes"
          value={value}
          placeholder="Enter general visit notes..."
          onChange={(event) => onChange(event.target.value)}
        />
      </CardContent>
    </Card>
  )
}
