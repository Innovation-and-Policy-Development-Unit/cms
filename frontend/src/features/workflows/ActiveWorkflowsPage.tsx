import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { casesAPI } from '@/api/ccms'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { User, Calendar } from 'lucide-react'

const SLA_VARIANT: Record<string, 'destructive' | 'warning' | 'success' | 'secondary'> = {
  overdue: 'destructive', at_risk: 'warning', on_track: 'success', completed: 'secondary',
}

const FAMILY_LABEL: Record<string, string> = {
  employee_disciplinary:       'Employee Disciplinary',
  serious_misconduct_employee: 'Serious Misconduct',
  temporary_suspension:        'Temp. Suspension',
  grievance:                   'Grievance',
  senior_serious_misconduct:   'Senior — Misconduct',
  senior_poor_performance:     'Senior — Performance',
}

/* Canonical Kanban columns — cases with unknown stages fall into the closest match */
const COLUMNS = [
  { key: 'Intake',               label: 'Intake',               color: 'bg-blue-500' },
  { key: 'Assessment',           label: 'Assessment',           color: 'bg-violet-500' },
  { key: 'Investigation',        label: 'Investigation',        color: 'bg-amber-500' },
  { key: 'Commission Decision',  label: 'Commission Decision',  color: 'bg-orange-500' },
  { key: 'Outcome',              label: 'Outcome / Closed',     color: 'bg-emerald-500' },
  { key: '__other__',            label: 'Other Stages',         color: 'bg-slate-400' },
]

/* Map an actual stage name to a canonical column key */
function mapToColumn(stageName: string): string {
  const n = stageName.toLowerCase()
  if (n.includes('intake') || n.includes('receipt') || n.includes('registration')) return 'Intake'
  if (n.includes('assess') || n.includes('review') || n.includes('preliminary')) return 'Assessment'
  if (n.includes('investig') || n.includes('inquiry') || n.includes('hearing')) return 'Investigation'
  if (n.includes('commission') || n.includes('decision') || n.includes('deliberat')) return 'Commission Decision'
  if (n.includes('outcome') || n.includes('clos') || n.includes('sanction') || n.includes('complet')) return 'Outcome'
  return '__other__'
}

type CaseRow = Record<string, unknown>

function KanbanCard({ c, onClick }: { c: CaseRow; onClick: () => void }) {
  const sla = c.overall_sla_status as string
  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-lg border bg-card p-3 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
    >
      <div className="flex items-start justify-between gap-1.5 mb-2">
        <span className="font-mono text-xs font-semibold text-primary leading-tight">
          {c.reference_number as string}
        </span>
        <Badge variant={SLA_VARIANT[sla] ?? 'secondary'} className="text-[10px] shrink-0 px-1.5">
          {sla?.replace('_', ' ')}
        </Badge>
      </div>
      <p className="text-sm font-semibold leading-snug line-clamp-2">{c.subject_name as string}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
        {FAMILY_LABEL[c.case_family as string] ?? (c.case_family as string)}
      </p>
      <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
        {(c.assigned_officer_name as string) && (
          <span className="flex items-center gap-1 truncate">
            <User className="h-3 w-3 shrink-0" />
            {c.assigned_officer_name as string}
          </span>
        )}
        {(c.date_received as string) && (
          <span className="flex items-center gap-1 shrink-0 ml-auto">
            <Calendar className="h-3 w-3" />
            {c.date_received as string}
          </span>
        )}
      </div>
    </div>
  )
}

export default function ActiveWorkflowsPage() {
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['cases', { status: 'active', page_size: 200 }],
    queryFn: () => casesAPI.list({ status: 'active', page_size: 200 }).then((r) => r.data),
  })

  const cases: CaseRow[] = data?.results ?? data ?? []

  /* Group cases into canonical columns */
  const columns = COLUMNS.map((col) => {
    const items = cases.filter((c) => {
      const stageName = ((c.active_stage as Record<string, string>)?.name) ?? ''
      return mapToColumn(stageName || '') === col.key
    })
    return { ...col, items }
  }).filter((col) => col.key !== '__other__' || col.items.length > 0)

  const totalCases = cases.length

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Active Workflows</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? 'Loading…' : `${totalCases} active case${totalCases !== 1 ? 's' : ''} across all stages`}
          </p>
        </div>
        {/* Column totals summary */}
        {!isLoading && (
          <div className="hidden lg:flex items-center gap-3">
            {columns.filter(c => c.items.length > 0).map((col) => (
              <div key={col.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`h-2 w-2 rounded-full ${col.color}`} />
                {col.label}: <span className="font-semibold text-foreground">{col.items.length}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kanban board */}
      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-none w-72 space-y-3">
              <Skeleton className="h-8 w-full rounded-lg" />
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-28 w-full rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-6 flex-1">
          {columns.map((col) => (
            <div key={col.key} className="flex-none w-72 flex flex-col gap-3">
              {/* Column header */}
              <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
                  <span className="text-sm font-semibold">{col.label}</span>
                </div>
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground px-1.5">
                  {col.items.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2.5">
                {col.items.length === 0 ? (
                  <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center text-xs text-muted-foreground">
                    No cases in this stage
                  </div>
                ) : (
                  col.items.map((c) => (
                    <KanbanCard
                      key={c.id as number}
                      c={c}
                      onClick={() => navigate({ to: '/cases/$id', params: { id: String(c.id) } })}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
