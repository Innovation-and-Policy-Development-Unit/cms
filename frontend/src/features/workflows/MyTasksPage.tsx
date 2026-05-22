import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { casesAPI } from '@/api/ccms'
import { useAuthStore } from '@/stores/authStore'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Clock, CheckCircle, ArrowRight, CalendarDays } from 'lucide-react'

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

type FilterTab = 'all' | 'overdue' | 'at_risk' | 'on_track'

const TABS: { key: FilterTab; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'all',      label: 'All',      icon: CalendarDays,   color: 'text-muted-foreground' },
  { key: 'overdue',  label: 'Overdue',  icon: AlertTriangle,  color: 'text-destructive' },
  { key: 'at_risk',  label: 'At Risk',  icon: Clock,          color: 'text-yellow-500' },
  { key: 'on_track', label: 'On Track', icon: CheckCircle,    color: 'text-emerald-500' },
]

export default function MyTasksPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['cases', { status: 'active', page_size: 200 }],
    queryFn: () => casesAPI.list({ status: 'active', page_size: 200 }).then((r) => r.data),
  })

  const allCases: Record<string, unknown>[] = data?.results ?? data ?? []

  const myName = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim()
  const myCases = allCases.filter(
    (c) => c.assigned_officer_name === myName || c.assigned_officer_name === user?.username
  )

  const counts = {
    all:      myCases.length,
    overdue:  myCases.filter((c) => c.overall_sla_status === 'overdue').length,
    at_risk:  myCases.filter((c) => c.overall_sla_status === 'at_risk').length,
    on_track: myCases.filter((c) => c.overall_sla_status === 'on_track').length,
  }

  const filtered = activeTab === 'all' ? myCases
    : myCases.filter((c) => c.overall_sla_status === activeTab)

  // Sort: overdue first, then at_risk, then on_track
  const sorted = [...filtered].sort((a, b) => {
    const order: Record<string, number> = { overdue: 0, at_risk: 1, on_track: 2 }
    return (order[a.overall_sla_status as string] ?? 3) - (order[b.overall_sla_status as string] ?? 3)
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
        <p className="text-sm text-muted-foreground">
          Cases assigned to you — {myName || user?.username}
        </p>
      </div>

      {/* Summary KPI row */}
      <div className="grid gap-3 sm:grid-cols-4">
        {TABS.map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-all hover:shadow-sm
              ${activeTab === key ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/40'}`}
          >
            <Icon className={`h-5 w-5 shrink-0 ${color}`} />
            <div>
              <p className="text-2xl font-bold">{counts[key]}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-muted-foreground">
          <CheckCircle className="h-10 w-10 text-emerald-400" />
          <p className="font-medium">No {activeTab === 'all' ? '' : activeTab.replace('_', ' ')} tasks</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((c) => {
            const stage = (c.active_stage as Record<string, string>)?.name
            return (
              <Card key={c.id as number}
                className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
                onClick={() => navigate({ to: '/cases/$id', params: { id: String(c.id) } })}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-semibold text-primary">{c.reference_number as string}</span>
                        <Badge variant="outline" className="text-xs">
                          {FAMILY_LABEL[c.case_family as string] ?? c.case_family as string}
                        </Badge>
                      </div>
                      <p className="text-base font-semibold">{c.subject_name as string}</p>
                      <p className="text-sm text-muted-foreground">{(c.subject_ministry as string) || '—'}</p>
                      {stage && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Current stage: <strong className="text-foreground">{stage}</strong></span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge variant={SLA_VARIANT[c.overall_sla_status as string] ?? 'secondary'}>
                        {(c.overall_sla_status as string)?.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" /> {c.date_received as string}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
