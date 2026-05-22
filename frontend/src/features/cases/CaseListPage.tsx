import { useEffect, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search, Filter, X, Info, Loader2, FolderOpen } from 'lucide-react'
import { casesAPI } from '@/api/ccms'
import { usePermissions } from '@/hooks/use-permissions'
import { ROLE_LABELS } from '@/lib/permissions'
import { CASE_SCOPE_BANNERS } from '@/lib/case-scope'
import {
  CASE_FAMILIES,
  CASE_STATUS_FILTER,
  FAMILY_LABEL,
  PORTAL_APPROVAL_FILTER,
} from '@/lib/case-labels'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { casesSearchHasFilters, type CasesSearch } from './casesSearch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TablePagination } from '@/components/ui/table-pagination'
import { TableEmptyState } from '@/components/ui/empty-state'
import { CaseListTableRow } from '@/components/cases/CaseListTableRow'
import { NewCaseDialog } from './NewCaseDialog'

interface PaginatedCases {
  count?: number
  next?: string | null
  previous?: string | null
  results?: Record<string, unknown>[]
}

interface Filters {
  q: string
  case_family: string
  status: string
  ministry: string
  portal_approval_status: string
}

function FilterBar({
  filters,
  qInput,
  onQInputChange,
  isSearching,
  onChange,
}: {
  filters: Filters
  qInput: string
  onQInputChange: (q: string) => void
  isSearching: boolean
  onChange: (f: Filters) => void
}) {
  const hasActive =
    filters.case_family ||
    filters.status ||
    filters.ministry ||
    filters.portal_approval_status ||
    filters.q

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search name, reference…"
          value={qInput}
          onChange={(e) => onQInputChange(e.target.value)}
          className="pl-8 h-9"
          aria-busy={isSearching}
        />
        {isSearching && (
          <span className="absolute right-2.5 top-2.5 flex items-center gap-1 text-[10px] text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Searching…
          </span>
        )}
      </div>

      <Select
        value={filters.case_family || '__all__'}
        onValueChange={(v) =>
          onChange({ ...filters, case_family: v === '__all__' ? '' : v })
        }
      >
        <SelectTrigger className="h-9 w-[210px]">
          <Filter className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
          <SelectValue placeholder="All Families" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All Families</SelectItem>
          {CASE_FAMILIES.map((f) => (
            <SelectItem key={f.value} value={f.value}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.status || '__all__'}
        onValueChange={(v) =>
          onChange({ ...filters, status: v === '__all__' ? '' : v })
        }
      >
        <SelectTrigger className="h-9 w-[140px]">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All Statuses</SelectItem>
          {CASE_STATUS_FILTER.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        placeholder="Filter by ministry…"
        value={filters.ministry}
        onChange={(e) => onChange({ ...filters, ministry: e.target.value })}
        className="h-9 min-w-[160px]"
      />

      <Select
        value={filters.portal_approval_status || '__all__'}
        onValueChange={(v) =>
          onChange({
            ...filters,
            portal_approval_status: v === '__all__' ? '' : v,
          })
        }
      >
        <SelectTrigger className="h-9 w-[200px]">
          <SelectValue placeholder="Portal approval" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All portal statuses</SelectItem>
          {PORTAL_APPROVAL_FILTER.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActive && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1 text-muted-foreground"
          onClick={() =>
            onChange({
              q: '',
              case_family: '',
              status: '',
              ministry: '',
              portal_approval_status: '',
            })
          }
        >
          <X className="h-3.5 w-3.5" /> Clear
        </Button>
      )}
    </div>
  )
}

export default function CaseListPage() {
  const navigate = useNavigate({ from: '/cases' })
  const search = useSearch({ from: '/cases' })
  const p = usePermissions()
  const [newOpen, setNewOpen] = useState(false)
  const [qInput, setQInput] = useState(search.q)
  const debouncedQ = useDebouncedValue(qInput, 300)

  useEffect(() => {
    setQInput(search.q)
  }, [search.q])

  useEffect(() => {
    if (debouncedQ === search.q) return
    navigate({
      search: (prev) => ({
        ...prev,
        q: debouncedQ,
        page: 1,
      }),
    })
  }, [debouncedQ, search.q, navigate])

  const filters: Filters = {
    q: search.q,
    case_family: search.case_family,
    status: search.status,
    ministry: search.ministry,
    portal_approval_status: search.portal_approval_status,
  }

  const setSearch = (patch: Partial<CasesSearch>) => {
    navigate({
      search: (prev) => ({
        ...prev,
        ...patch,
      }),
    })
  }

  const setFilters = (next: Filters) => {
    setQInput(next.q)
    setSearch({
      q: next.q,
      case_family: next.case_family,
      status: next.status,
      ministry: next.ministry,
      portal_approval_status: next.portal_approval_status,
      page: 1,
    })
  }

  const querySearch = { ...search, q: debouncedQ }
  const isSearching = qInput !== debouncedQ

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['cases', querySearch],
    queryFn: () =>
      casesAPI
        .list({
          page: search.page,
          page_size: search.page_size,
          case_family: search.case_family || undefined,
          status: search.status || undefined,
          search: debouncedQ || undefined,
          subject_ministry: search.ministry || undefined,
          portal_approval_status: search.portal_approval_status || undefined,
        })
        .then((r) => r.data as PaginatedCases),
    placeholderData: (prev) => prev,
  })

  const cases = data?.results ?? []
  const totalCount = data?.count ?? cases.length
  const scopeMsg = p.role ? CASE_SCOPE_BANNERS[p.role] : undefined
  const hasFilters = casesSearchHasFilters(search)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cases</h1>
          <p className="text-sm text-muted-foreground">
            {p.canSeeFullList
              ? 'All compliance cases managed by OPSC'
              : `Viewing as ${ROLE_LABELS[p.role ?? ''] ?? p.role}`}
            {totalCount > 0 && (
              <span className="text-muted-foreground/80">
                {' '}
                · {totalCount} case{totalCount === 1 ? '' : 's'} in scope
              </span>
            )}
          </p>
        </div>
        {p.canCreateCase && (
          <Button onClick={() => setNewOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New Case
          </Button>
        )}
      </div>

      {scopeMsg && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm ${scopeMsg.color}`}
        >
          <Info className="h-4 w-4 shrink-0" />
          {scopeMsg.text}
        </div>
      )}

      <FilterBar
        filters={filters}
        qInput={qInput}
        onQInputChange={setQInput}
        isSearching={isSearching}
        onChange={setFilters}
      />

      {filters.case_family && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Showing:</span>
          <Badge variant="secondary" className="gap-1">
            {FAMILY_LABEL[filters.case_family]}
            <button
              type="button"
              onClick={() => setFilters({ ...filters, case_family: '' })}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Ministry</TableHead>
                <TableHead>Case Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Portal</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Active Stage</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Date Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : cases.length === 0 ? (
                <TableEmptyState
                  colSpan={10}
                  icon={FolderOpen}
                  title={
                    hasFilters
                      ? 'No cases match the current filters'
                      : 'No cases in your scope'
                  }
                  description={
                    hasFilters
                      ? 'Try clearing filters or broadening your search.'
                      : p.canCreateCase
                        ? 'Create a case to start the compliance workflow.'
                        : 'Cases will appear here when you have access to them.'
                  }
                >
                  {hasFilters && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setFilters({
                          q: '',
                          case_family: '',
                          status: '',
                          ministry: '',
                          portal_approval_status: '',
                        })
                      }
                    >
                      Clear filters
                    </Button>
                  )}
                  {p.canCreateCase && (
                    <Button type="button" size="sm" onClick={() => setNewOpen(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Create case
                    </Button>
                  )}
                </TableEmptyState>
              ) : (
                cases.map((c) => <CaseListTableRow key={c.id as number} c={c} />)
              )}
            </TableBody>
          </Table>

          <TablePagination
            page={search.page}
            pageSize={search.page_size}
            totalCount={totalCount}
            disabled={isLoading || isFetching || isSearching}
            onPageChange={(page) => setSearch({ page })}
            onPageSizeChange={(page_size) =>
              setSearch({ page_size, page: 1 })
            }
          />
        </CardContent>
      </Card>

      <NewCaseDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onSuccess={(id) => navigate({ to: '/cases/$id', params: { id } })}
      />
    </div>
  )
}
