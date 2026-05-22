import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Briefcase, CheckCircle, AlertTriangle, Clock, ArrowRight, Activity } from 'lucide-react'
import { dashboardAPI, casesAPI, auditAPI } from '@/api/ccms'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const FAMILY_LABEL: Record<string, string> = {
  employee_disciplinary:       'Employee Disciplinary',
  serious_misconduct_employee: 'Serious Misconduct',
  temporary_suspension:        'Temp. Suspension',
  grievance:                   'Grievance',
  senior_serious_misconduct:   'Senior — Misconduct',
  senior_poor_performance:     'Senior — Performance',
}

const SLA_VARIANT: Record<string, 'destructive' | 'warning' | 'success' | 'secondary'> = {
  overdue: 'destructive', at_risk: 'warning', on_track: 'success', completed: 'secondary',
}

const CHART_COLORS = ['#3C50E0', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

function KpiCard({ title, value, icon: Icon, bg, sub }: {
  title: string; value: number | undefined; icon: React.ElementType; bg: string; sub: string
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {value === undefined
              ? <Skeleton className="mt-2 h-9 w-16" />
              : <p className="mt-1 text-4xl font-bold tracking-tight">{value}</p>}
            <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${bg}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { data: stats } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardAPI.stats().then((r) => r.data),
  })

  const { data: activeData, isLoading: activeLoading } = useQuery({
    queryKey: ['cases', { dashboard: 'active' }],
    queryFn: () => casesAPI.list({ status: 'active', page_size: 10 }).then((r) => r.data),
  })

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['audit', { dashboard: true }],
    queryFn: () => auditAPI.list({ page_size: 6 }).then((r) => r.data),
  })

  const allActive: Record<string, unknown>[] = activeData?.results ?? activeData ?? []

  const urgentCases = allActive
    .filter((c) => c.overall_sla_status === 'overdue' || c.overall_sla_status === 'at_risk')
    .slice(0, 5)

  const myTasks = allActive
    .filter((c) =>
      c.assigned_officer_name === `${user?.first_name} ${user?.last_name}`.trim() ||
      c.assigned_officer_name === user?.username
    )
    .slice(0, 5)

  const auditLogs: Record<string, unknown>[] = auditData?.results ?? auditData ?? []

  const chartData = (stats?.cases_by_family ?? []).map((item: { case_family: string; count: number }) => ({
    name: FAMILY_LABEL[item.case_family] ?? item.case_family,
    count: item.count,
  }))

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, {user?.first_name || user?.username} — Office of the Public Service Commission
          </p>
        </div>
      </div>

      {/* Row 1 — KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Total Cases"    value={stats?.total_cases}   icon={Briefcase}     bg="bg-primary"       sub="All time" />
        <KpiCard title="Active Cases"   value={stats?.active_cases}  icon={Clock}         bg="bg-blue-500"      sub="Currently open" />
        <KpiCard title="Closed Cases"   value={stats?.closed_cases}  icon={CheckCircle}   bg="bg-emerald-500"   sub="Resolved" />
        <KpiCard title="Overdue Stages" value={stats?.overdue_cases} icon={AlertTriangle} bg="bg-rose-500"      sub="Require immediate action" />
      </div>

      {/* Row 2 — Chart + Urgent */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Cases by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 52, left: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-28} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {chartData.map((_: unknown, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Overdue &amp; At-Risk</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary"
                onClick={() => navigate({ to: '/reports/compliance' })}>
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {activeLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)
            ) : urgentCases.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center text-muted-foreground">
                <CheckCircle className="mb-2 h-8 w-8 text-emerald-400" />
                <p className="text-sm font-medium">All cases on track</p>
              </div>
            ) : urgentCases.map((c) => (
              <div key={c.id as number}
                onClick={() => navigate({ to: '/cases/$id', params: { id: String(c.id) } })}
                className="flex cursor-pointer items-center justify-between rounded-lg border bg-muted/30 p-3 hover:bg-muted transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-xs font-mono font-semibold text-primary truncate">{c.reference_number as string}</p>
                  <p className="text-sm font-medium truncate leading-tight">{c.subject_name as string}</p>
                </div>
                <Badge variant={SLA_VARIANT[c.overall_sla_status as string] ?? 'secondary'} className="ml-2 shrink-0 text-xs">
                  {(c.overall_sla_status as string)?.replace('_', ' ')}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Row 3 — Recent Activity + My Tasks */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                Recent Activity
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary"
                onClick={() => navigate({ to: '/audit' })}>
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {auditLoading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : auditLogs.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ol className="relative ml-3 space-y-4 border-l border-border pt-1">
                {auditLogs.map((log) => (
                  <li key={log.id as number} className="ml-5">
                    <div className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-card bg-primary" />
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(log.timestamp as string).toLocaleString()}
                    </p>
                    <p className="text-sm font-medium leading-snug">{log.description as string}</p>
                    <p className="text-xs text-muted-foreground">{(log.user_name as string) ?? 'System'}</p>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">My Tasks</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary"
                onClick={() => navigate({ to: '/workflows/my-tasks' })}>
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {myTasks.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center text-muted-foreground">
                <CheckCircle className="mb-2 h-8 w-8 text-emerald-400" />
                <p className="text-sm font-medium">No tasks assigned to you</p>
              </div>
            ) : myTasks.map((c) => (
              <div key={c.id as number}
                onClick={() => navigate({ to: '/cases/$id', params: { id: String(c.id) } })}
                className="flex cursor-pointer items-center justify-between rounded-lg border bg-muted/30 p-3 hover:bg-muted transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-xs font-mono font-semibold text-primary">{c.reference_number as string}</p>
                  <p className="text-sm font-medium truncate leading-tight">{c.subject_name as string}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {(c.active_stage as Record<string, string>)?.name ?? 'No active stage'}
                  </p>
                </div>
                <Badge variant={SLA_VARIANT[c.overall_sla_status as string] ?? 'secondary'} className="ml-2 shrink-0 text-xs">
                  {(c.overall_sla_status as string)?.replace('_', ' ')}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
