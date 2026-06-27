import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import type { AuditLogFilterOptions, AuditLogFilters } from '@/types/audit'

type AuditLogFiltersProps = {
  filters: AuditLogFilters
  options?: AuditLogFilterOptions
  onChange: (filters: AuditLogFilters) => void
}

export function AuditLogFilters({
  filters,
  options,
  onChange,
}: AuditLogFiltersProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div className="space-y-2 md:col-span-2 xl:col-span-3">
        <Label htmlFor="audit-log-search">Search</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="audit-log-search"
            value={filters.search}
            onChange={(event) =>
              onChange({ ...filters, search: event.target.value, page: 1 })
            }
            placeholder="Search actor, action, entity, or details"
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="audit-log-actor">User</Label>
        <Select
          id="audit-log-actor"
          value={filters.actorUserId}
          onChange={(event) =>
            onChange({ ...filters, actorUserId: event.target.value, page: 1 })
          }
        >
          <option value="">All users</option>
          {(options?.actors ?? []).map((actor) => (
            <option key={actor.id} value={actor.id}>
              {actor.fullName} (@{actor.username})
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="audit-log-action">Action</Label>
        <Select
          id="audit-log-action"
          value={filters.action}
          onChange={(event) =>
            onChange({ ...filters, action: event.target.value, page: 1 })
          }
        >
          <option value="">All actions</option>
          {(options?.actions ?? []).map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="audit-log-entity">Entity</Label>
        <Select
          id="audit-log-entity"
          value={filters.entityType}
          onChange={(event) =>
            onChange({ ...filters, entityType: event.target.value, page: 1 })
          }
        >
          <option value="">All entities</option>
          {(options?.entityTypes ?? []).map((entityType) => (
            <option key={entityType} value={entityType}>
              {entityType}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="audit-log-from-date">From Date</Label>
        <Input
          id="audit-log-from-date"
          type="date"
          value={filters.fromDate}
          onChange={(event) =>
            onChange({ ...filters, fromDate: event.target.value, page: 1 })
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="audit-log-to-date">To Date</Label>
        <Input
          id="audit-log-to-date"
          type="date"
          value={filters.toDate}
          onChange={(event) =>
            onChange({ ...filters, toDate: event.target.value, page: 1 })
          }
        />
      </div>
    </div>
  )
}
