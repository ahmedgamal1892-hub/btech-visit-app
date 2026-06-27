import { ArrowDownUp, Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import type { UserDirectoryFilters } from '@/features/users/types/user-directory.types'

type UserManagementFiltersProps = {
  filters: UserDirectoryFilters
  onChange: (filters: UserDirectoryFilters) => void
}

export function UserManagementFilters({
  filters,
  onChange,
}: UserManagementFiltersProps) {
  const updateFilters = (patch: Partial<UserDirectoryFilters>) => {
    onChange({
      ...filters,
      ...patch,
      page: patch.page ?? 1,
    })
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/20 p-4 md:p-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="user-name-search">Search by name</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="user-name-search"
              value={filters.nameSearch}
              onChange={(event) =>
                updateFilters({ nameSearch: event.target.value })
              }
              placeholder="Full name"
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="user-username-search">Search by username</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="user-username-search"
              value={filters.usernameSearch}
              onChange={(event) =>
                updateFilters({ usernameSearch: event.target.value })
              }
              placeholder="Username"
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
              updateFilters({
                role: event.target.value as UserDirectoryFilters['role'],
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
              updateFilters({
                isActive: event.target
                  .value as UserDirectoryFilters['isActive'],
              })
            }
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="user-sort-by">Sort by</Label>
          <div className="relative">
            <ArrowDownUp className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Select
              id="user-sort-by"
              value={filters.sortBy}
              className="pl-9"
              onChange={(event) =>
                updateFilters({
                  sortBy: event.target.value as UserDirectoryFilters['sortBy'],
                })
              }
            >
              <option value="name">Name</option>
              <option value="created_at">Created Date</option>
              <option value="last_login">Last Login</option>
              <option value="visits_count">Visits Count</option>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="user-sort-dir">Direction</Label>
          <Select
            id="user-sort-dir"
            value={filters.sortDir}
            onChange={(event) =>
              updateFilters({
                sortDir: event.target.value as UserDirectoryFilters['sortDir'],
              })
            }
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </Select>
        </div>
      </div>
    </div>
  )
}
