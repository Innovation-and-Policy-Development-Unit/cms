import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ClipboardCheck, ArrowRight, CheckCircle2 } from 'lucide-react'
import { casesAPI } from '@/api/ccms'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TableEmptyState } from '@/components/ui/empty-state'

import { familyLabel } from '@/lib/case-labels'

export default function ApprovalQueuePage() {
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['cases', 'approval-queue'],
    queryFn: () =>
      casesAPI
        .list({
          portal_approval_status: 'pending_manager',
          status: 'active',
          page_size: 50,
          ordering: '-date_opened',
        })
        .then((r) => r.data),
  })

  const cases: Record<string, unknown>[] = data?.results ?? []
  const total = data?.count ?? cases.length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardCheck className="h-7 w-7 text-primary" />
            Approval queue
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cases awaiting your approval before SCDMS registration ({total} pending)
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            navigate({
              to: '/cases',
              search: {
                page: 1,
                page_size: 20,
                q: '',
                case_family: '',
                status: 'active',
                ministry: '',
                portal_approval_status: 'pending_manager',
              },
            })
          }
        >
          Open in Cases list
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending manager approval</CardTitle>
          <CardDescription>
            Review portal form type and compliance notes, then approve or reject from the case
            detail page (SCDMS menu).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Ministry</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Portal form</TableHead>
                <TableHead>Received</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : cases.length === 0 ? (
                <TableEmptyState
                  colSpan={7}
                  icon={CheckCircle2}
                  title="Queue is empty"
                  description="No cases are waiting for manager portal approval right now."
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate({ to: '/cases' })}
                  >
                    View all cases
                  </Button>
                </TableEmptyState>
              ) : (
                cases.map((c) => (
                  <TableRow key={c.id as number}>
                    <TableCell className="font-mono text-sm font-semibold text-primary">
                      {c.reference_number as string}
                    </TableCell>
                    <TableCell className="font-medium">{c.subject_name as string}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {(c.subject_ministry as string) || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {familyLabel(c.case_family as string, 'short')}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {(c.portal_form_type_code as string) || '—'}
                    </TableCell>
                    <TableCell className="text-xs">{c.date_received as string}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1"
                        onClick={() =>
                          navigate({
                            to: '/cases/$id',
                            params: { id: String(c.id) },
                          })
                        }
                      >
                        Review
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
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
