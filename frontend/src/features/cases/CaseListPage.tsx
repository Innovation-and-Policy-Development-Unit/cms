import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search, Filter, X, Info } from 'lucide-react'
import { casesAPI } from '@/api/ccms'
import { usePermissions } from '@/hooks/use-permissions'
import { ROLE_LABELS } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { NewCaseDialog, CASE_FAMILIES } from './NewCaseDialog'

/* ─── Constants ─────────────────────────────────────────────────── */
const STATUSES = [
  { value: 'active',   label: 'Active' },
  { value: 'on_hold',  label: 'On Hold' },
  { value: 'closed',   label: 'Closed' },
  { value: 'archived', label: 'Archived' },
]

const FAMILY_LABEL: Record<string, string> = Object.fromEntries(
  CASE_FAMILIES.map((f) => [f.value, f.label])
)

const SLA_VARIANT: Record<string, 'destructive' | 'warning' | 'success' | 'secondary'> = {
  overdue: 'destructive', at_risk: 'warning', on_track: 'success', completed: 'secondary',
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  active: 'default', on_hold: 'secondary', closed: 'outline', archived: 'outline',
}

/* ─── Filter Bar ────────────────────────────────────────────────── */
const PORTAL_APPROVAL_FILTER = [
  { value: 'pending_manager', label: 'Pending Manager Approval' },
  { value: 'approved', label: 'Approved for Portal' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'sent_to_portal', label: 'Sent to Portal' },
]

const PORTAL_STATUS_LABEL: Record<string, string> = Object.fromEntries(
  PORTAL_APPROVAL_FILTER.map((o) => [o.value, o.label]),
)

interface Filters { q: string; case_family: string; status: string; ministry: string; portal_approval_status: string }

function FilterBar({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  const hasActive = filters.case_family || filters.status || filters.ministry
    || filters.portal_approval_status || filters.q
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search name, reference…" value={filters.q}
          onChange={(e) => onChange({ ...filters, q: e.target.value })} className="pl-8 h-9" />
      </div>

      <Select value={filters.case_family || '__all__'}
        onValueChange={(v) => onChange({ ...filters, case_family: v === '__all__' ? '' : v })}>
        <SelectTrigger className="h-9 w-[210px]">
          <Filter className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
          <SelectValue placeholder="All Families" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All Families</SelectItem>
          {CASE_FAMILIES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.status || '__all__'}
        onValueChange={(v) => onChange({ ...filters, status: v === '__all__' ? '' : v })}>
        <SelectTrigger className="h-9 w-[140px]">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All Statuses</SelectItem>
          {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Input placeholder="Filter by ministry…" value={filters.ministry}
        onChange={(e) => onChange({ ...filters, ministry: e.target.value })}
        className="h-9 min-w-[160px]" />

      <Select value={filters.portal_approval_status || '__all__'}
        onValueChange={(v) => onChange({ ...filters, portal_approval_status: v === '__all__' ? '' : v })}>
        <SelectTrigger className="h-9 w-[200px]">
          <SelectValue placeholder="Portal approval" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All portal statuses</SelectItem>
          {PORTAL_APPROVAL_FILTER.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActive && (
        <Button variant="ghost" size="sm" className="h-9 gap-1 text-muted-foreground"
          onClick={() => onChange({ q: '', case_family: '', status: '', ministry: '', portal_approval_status: '' })}>
          <X className="h-3.5 w-3.5" /> Clear
        </Button>
      )}
    </div>
  )
}

/* ─── Scope banner — shown to restricted roles ───────────────────── */
const SCOPE_MESSAGES: Partial<Record<string, { color: string; text: string }>> = {
  commission_member:  { color: 'bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/20 dark:border-violet-800 dark:text-violet-300', text: 'You are viewing cases that have reached Commission level.' },
  dg_director:        { color: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-300',   text: 'You are viewing cases from your Ministry / Department only.' },
  mdc_panel_mediator: { color: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-300', text: 'You are viewing cases assigned to you.' },
  employee_subject:   { color: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-300', text: 'You are viewing your own case(s) only.' },
}

/* ─── Page ──────────────────────────────────────────────────────── */
export default function CaseListPage() {
  const navigate = useNavigate()
  const p = usePermissions()
  const [newOpen, setNewOpen] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    q: '', case_family: '', status: '', ministry: '', portal_approval_status: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['cases', filters],
    queryFn: () =>
      casesAPI.list({
        case_family: filters.case_family || undefined,
        status: filters.status || undefined,
        search: filters.q || undefined,
        subject_ministry: filters.ministry || undefined,
        portal_approval_status: filters.portal_approval_status || undefined,
      }).then((r) => r.data),
  })

  const cases = data?.results ?? data ?? []
  const scopeMsg = p.role ? SCOPE_MESSAGES[p.role] : undefined

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cases</h1>
          <p className="text-sm text-muted-foreground">
            {p.canSeeFullList
              ? 'All compliance cases managed by OPSC'
              : `Viewing as ${ROLE_LABELS[p.role ?? ''] ?? p.role}`}
          </p>
        </div>
        {p.canCreateCase && (
          <Button onClick={() => setNewOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New Case
          </Button>
        )}
      </div>

      {/* Role scope banner */}
      {scopeMsg && (
        <div className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm ${scopeMsg.color}`}>
          <Info className="h-4 w-4 shrink-0" />
          {scopeMsg.text}
        </div>
      )}

      <FilterBar filters={filters} onChange={setFilters} />

      {filters.case_family && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Showing:</span>
          <Badge variant="secondary" className="gap-1">
            {FAMILY_LABEL[filters.case_family]}
            <button onClick={() => setFilters((f) => ({ ...f, case_family: '' }))}>
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
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : cases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-16 text-center text-muted-foreground">
                    No cases match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                cases.map((c: Record<string, unknown>) => (
                  <TableRow key={c.id as number} className="cursor-pointer"
                    onClick={() => navigate({ to: '/cases/$id', params: { id: String(c.id) } })}>
                    <TableCell className="font-mono text-sm font-semibold text-primary whitespace-nowrap">
                      {c.reference_number as string}
                    </TableCell>
                    <TableCell className="font-medium">{c.subject_name as string}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{(c.subject_ministry as string) || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        {FAMILY_LABEL[c.case_family as string] ?? c.case_family as string}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[c.status as string] ?? 'outline'}>
                        {(c.status as string)?.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {(c.portal_form_type_code as string) && (
                        <span className="font-mono block">{c.portal_form_type_code as string}</span>
                      )}
                      {(c.portal_approval_status as string) ? (
                        <Badge variant="outline" className="text-[10px] mt-0.5">
                          {PORTAL_STATUS_LABEL[c.portal_approval_status as string]
                            ?? (c.portal_approval_status as string).replace(/_/g, ' ')}
                        </Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={SLA_VARIANT[c.overall_sla_status as string] ?? 'secondary'}>
                        {(c.overall_sla_status as string)?.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {(c.active_stage as Record<string, string>)?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs">{(c.assigned_officer_name as string) ?? '—'}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{c.date_received as string}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
