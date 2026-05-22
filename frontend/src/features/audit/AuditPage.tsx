import { useQuery } from '@tanstack/react-query'
import { auditAPI } from '@/api/ccms'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TableEmptyState } from '@/components/ui/empty-state'
import { Scale } from 'lucide-react'

const ACTION_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> = {
  case_created: 'default',
  case_closed: 'secondary',
  stage_updated: 'secondary',
  decision_added: 'default',
}

export default function AuditPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit'],
    queryFn: () => auditAPI.list().then((r) => r.data),
  })

  const logs = data?.results ?? data ?? []

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Trail</h1>
        <p className="text-sm text-muted-foreground">Immutable record of all system actions</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableEmptyState
                  colSpan={5}
                  icon={Scale}
                  title="No audit entries yet"
                  description="Actions on cases, stages, and settings will appear here automatically."
                />
              ) : (
                logs.map((log: Record<string, unknown>) => (
                  <TableRow key={log.id as number}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.timestamp as string).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs">{(log.user_name as string) ?? 'System'}</TableCell>
                    <TableCell>
                      <Badge variant={ACTION_VARIANT[log.action as string] ?? 'secondary'}>
                        {(log.action as string)?.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{log.resource_type as string} #{log.resource_id as number}</TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{log.description as string}</TableCell>
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
