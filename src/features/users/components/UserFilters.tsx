import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import type { UserListFilters } from '@/types/user'

type UserFiltersProps = {
  filters: UserListFilters
  onChange: (filters: UserListFilters) => void
}

export function UserFilters({ filters, onChange }: UserFiltersProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="space-y-2 md:col-span-2 xl:col-span-2">
        <Label htmlFor="user-search">Search</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="user-search"
            value={filters.search}
            onChange={(event) =>
              onChange({ ...filters, search: event.target.value, page: 1 })
            }
            placeholder="Search by name or username"
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="user-role-filter">Role</Label>
        <Select
          id="user-role-filter"
          value={filters.role}
          onChange={(event) =>
            onChange({
              ...filters,
              role: event.target.value as UserListFilters['role'],
              page: 1,
            })
          }
        >
          <option value="all">All roles</option>
          <option value="Admin">Admin</option>
          <option value="Visitor">Visitor</option>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="user-status-filter">Status</Label>
        <Select
          id="user-status-filter"
          value={filters.isActive}
          onChange={(event) =>
            onChange({
              ...filters,
              isActive: event.target.value as UserListFilters['isActive'],
              page: 1,
            })
          }
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>
    </div>
  )
}
