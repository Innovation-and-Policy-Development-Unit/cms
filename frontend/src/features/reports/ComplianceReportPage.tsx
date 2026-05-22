import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { casesAPI } from '@/api/ccms'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertTriangle, Clock, CheckCircle, TrendingUp } from 'lucide-react'

const SLA_VARIANT: Record<string, 'destructive' | 'warning' | 'success' | 'secondary'> = {
  overdue: 'destructive',
  at_risk: 'warning',
  on_track: 'success',
  completed: 'secondary',
}

const FAMILY_LABEL: Record<string, string> = {
  employee_disciplinary: 'Employee Disciplinary',
  serious_misconduct_employee: 'Serious Misconduct',
  temporary_suspension: 'Temp. Suspension',
  grievance: 'Grievance',
  senior_serious_misconduct: 'Senior — Misconduct',
  senior_poor_performance: 'Senior — Performance',
}

export default function ComplianceReportPage() {
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['cases-compliance'],
    queryFn: () => casesAPI.list({ page_size: 500 }).then((r) => r.data),
  })

  const cases: Record<string, unknown>[] = data?.results ?? data ?? []

  const overdue = cases.filter((c) => c.overall_sla_status === 'overdue')
  const atRisk  = cases.filter((c) => c.overall_sla_status === 'at_risk')
  const onTrack = cases.filter((c) => c.overall_sla_status === 'on_track')
  const total   = cases.length
  const compliant = onTrack.length
  const rate    = total > 0 ? Math.round((compliant / total) * 100) : 0

  const kpis = [
    { label: 'Compliance Rate', value: `${rate}%`, icon: TrendingUp, color: 'text-green-500' },
    { label: 'Overdue Cases', value: overdue.length, icon: AlertTriangle, color: 'text-destructive' },
    { label: 'At Risk', value: atRisk.length, icon: Clock, color: 'text-yellow-500' },
    { label: 'On Track', value: onTrack.length, icon: CheckCircle, color: 'text-green-500' },
  ]

  const prioritised = [...overdue, ...atRisk, ...onTrack]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Compliance Report</h1>
        <p className="text-sm text-muted-foreground">SLA adherence and statutory deadline tracking — IPDU-SOP-001</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</CardTitle>
              <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <p className="text-3xl font-bold">{value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table — overdue first */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">All Cases by SLA Status</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Case Type</TableHead>
                <TableHead>Active Stage</TableHead>
                <TableHead>SLA Status</TableHead>
                <TableHead>Date Received</TableHead>
                <TableHead>Assigned To</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : prioritised.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    No cases found.
                  </TableCell>
                </TableRow>
              ) : (
                prioritised.map((c) => (
                  <TableRow
                    key={c.id as number}
                    className="cursor-pointer"
                    onClick={() => navigate({ to: '/cases/$id', params: { id: String(c.id) } })}
                  >
                    <TableCell className="font-mono text-sm font-medium text-primary">
                      {c.reference_number as string}
                    </TableCell>
                    <TableCell className="font-medium">{c.subject_name as string}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {FAMILY_LABEL[c.case_family as string] ?? c.case_family as string}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {(c.active_stage as Record<string, string>)?.name ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={SLA_VARIANT[c.overall_sla_status as string] ?? 'secondary'}>
                        {(c.overall_sla_status as string)?.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{c.date_received as string}</TableCell>
                    <TableCell className="text-xs">{(c.assigned_officer_name as string) ?? '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
