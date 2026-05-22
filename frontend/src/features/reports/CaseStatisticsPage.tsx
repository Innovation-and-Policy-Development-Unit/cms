import { useQuery } from '@tanstack/react-query'
import { dashboardAPI, casesAPI } from '@/api/ccms'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts'

const FAMILY_LABEL: Record<string, string> = {
  employee_disciplinary: 'Employee Disciplinary',
  serious_misconduct_employee: 'Serious Misconduct',
  temporary_suspension: 'Temp. Suspension',
  grievance: 'Grievance',
  senior_serious_misconduct: 'Senior — Misconduct',
  senior_poor_performance: 'Senior — Performance',
}

const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

const SLA_COLORS: Record<string, string> = {
  on_track: '#10b981',
  at_risk: '#f59e0b',
  overdue: '#ef4444',
  completed: '#6b7280',
}

export default function CaseStatisticsPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardAPI.stats().then((r) => r.data),
  })

  const { data: allCasesData, isLoading: casesLoading } = useQuery({
    queryKey: ['cases-all-stats'],
    queryFn: () => casesAPI.list({ page_size: 1000 }).then((r) => r.data),
  })

  const isLoading = statsLoading || casesLoading

  const familyChart = (stats?.cases_by_family ?? []).map((item: { case_family: string; count: number }) => ({
    name: FAMILY_LABEL[item.case_family] ?? item.case_family,
    count: item.count,
  }))

  const allCases: Record<string, unknown>[] = allCasesData?.results ?? allCasesData ?? []

  // SLA distribution
  const slaCounts = allCases.reduce<Record<string, number>>((acc, c) => {
    const s = (c.overall_sla_status as string) ?? 'unknown'
    acc[s] = (acc[s] ?? 0) + 1
    return acc
  }, {})
  const slaChart = Object.entries(slaCounts).map(([name, value]) => ({ name: name.replace('_', ' '), value, fill: SLA_COLORS[name] ?? '#6b7280' }))

  // Status distribution
  const statusCounts = allCases.reduce<Record<string, number>>((acc, c) => {
    const s = (c.status as string) ?? 'unknown'
    acc[s] = (acc[s] ?? 0) + 1
    return acc
  }, {})
  const statusChart = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Case Statistics</h1>
        <p className="text-sm text-muted-foreground">Trends, distribution, and performance overview</p>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Cases', value: stats?.total_cases },
          { label: 'Active', value: stats?.active_cases },
          { label: 'Closed', value: stats?.closed_cases },
          { label: 'Overdue Stages', value: stats?.overdue_cases },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <p className="text-3xl font-bold">{value ?? 0}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Cases by type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Cases by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-52 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={familyChart} margin={{ top: 4, right: 8, bottom: 48, left: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {familyChart.map((_: unknown, i: number) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* SLA distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">SLA Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-52 w-full" /> : slaChart.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">No data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={slaChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {slaChart.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Cases by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-52 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={statusChart} margin={{ top: 4, right: 8, bottom: 8, left: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
