import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { casesAPI } from '@/api/ccms'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { familyLabel } from '@/lib/case-labels'
import { TableEmptyState } from '@/components/ui/empty-state'
import { Gavel } from 'lucide-react'

export default function LitigationCostsPage() {
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['cases-litigation'],
    queryFn: () => casesAPI.list({ status: 'closed', page_size: 500 }).then((r) => r.data),
  })

  const cases: Record<string, unknown>[] = data?.results ?? data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Litigation & Costs</h1>
        <p className="text-sm text-muted-foreground">Closed cases with associated legal proceedings and cost tracking</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Closed Cases</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-3xl font-bold">{cases.length}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">With Litigation</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <p className="text-3xl font-bold">
                {cases.filter((c) => (c.litigation_records as unknown[])?.length > 0).length}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">No Litigation</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <p className="text-3xl font-bold">
                {cases.filter((c) => !((c.litigation_records as unknown[])?.length > 0)).length}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Closed Cases</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Ministry</TableHead>
                <TableHead>Case Type</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead>Litigation</TableHead>
                <TableHead>Date Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : cases.length === 0 ? (
                <TableEmptyState
                  colSpan={7}
                  icon={Gavel}
                  title="No closed cases yet"
                  description="Litigation cost tracking appears once cases are closed."
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate({ to: '/cases', search: { status: 'closed' } })}
                  >
                    View closed cases
                  </Button>
                </TableEmptyState>
              ) : (
                cases.map((c) => {
                  const hasLitigation = ((c.litigation_records as unknown[])?.length ?? 0) > 0
                  return (
                    <TableRow
                      key={c.id as number}
                      className="cursor-pointer"
                      onClick={() => navigate({ to: '/cases/$id', params: { id: String(c.id) } })}
                    >
                      <TableCell className="font-mono text-sm font-medium text-primary">
                        {c.reference_number as string}
                      </TableCell>
                      <TableCell className="font-medium">{c.subject_name as string}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{(c.subject_ministry as string) || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {familyLabel(c.case_family as string, 'short')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {(c.decision_summary as string) || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={hasLitigation ? 'destructive' : 'secondary'}>
                          {hasLitigation ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{c.date_received as string}</TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
