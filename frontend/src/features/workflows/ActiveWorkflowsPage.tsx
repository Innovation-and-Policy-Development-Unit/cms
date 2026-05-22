import { useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { casesAPI } from '@/api/ccms'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SlaBadge } from '@/components/ui/sla-badge'
import { User, Calendar, Info, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { familyLabel } from '@/lib/case-labels'
import { cn } from '@/lib/utils'

type CaseRow = Record<string, unknown>

function activeStageName(c: CaseRow): string {
  const stage = c.active_stage as Record<string, string> | undefined
  const name = stage?.name?.trim()
  if (name) return name
  return 'No active stage'
}

function KanbanCard({ c, onOpen }: { c: CaseRow; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'w-full rounded-lg border bg-card p-3 text-left shadow-sm',
        'hover:shadow-md hover:border-primary/30 transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      )}
    >
      <div className="flex items-start justify-between gap-1.5 mb-2">
        <span className="font-mono text-xs font-semibold text-primary leading-tight">
          {c.reference_number as string}
        </span>
        <SlaBadge status={c.overall_sla_status as string} size="sm" />
      </div>
      <p className="text-sm font-semibold leading-snug line-clamp-2">{c.subject_name as string}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
        {familyLabel(c.case_family as string, 'short')}
      </p>
      <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
        {(c.assigned_officer_name as string) && (
          <span className="flex items-center gap-1 truncate">
            <User className="h-3 w-3 shrink-0" aria-hidden />
            {c.assigned_officer_name as string}
          </span>
        )}
        {(c.date_received as string) && (
          <span className="flex items-center gap-1 shrink-0 ml-auto">
            <Calendar className="h-3 w-3" aria-hidden />
            {c.date_received as string}
          </span>
        )}
      </div>
    </button>
  )
}

export default function ActiveWorkflowsPage() {
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['cases', { status: 'active', page_size: 200, kanban: true }],
    queryFn: () => casesAPI.list({ status: 'active', page_size: 200 }).then((r) => r.data),
  })

  const cases: CaseRow[] = data?.results ?? data ?? []

  const columns = useMemo(() => {
    const map = new Map<string, CaseRow[]>()
    for (const c of cases) {
      const key = activeStageName(c)
      const list = map.get(key) ?? []
      list.push(c)
      map.set(key, list)
    }
    return [...map.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([label, items]) => ({ key: label, label, items }))
  }, [cases])

  const totalCases = cases.length

  return (
    <div className="flex flex-col gap-5 h-full">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pipeline overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading
              ? 'Loading…'
              : `${totalCases} active case${totalCases !== 1 ? 's' : ''} grouped by current statutory workflow stage`}
          </p>
          <p className="flex items-start gap-2 mt-2 text-xs text-muted-foreground max-w-2xl">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
            Columns reflect each case&apos;s next incomplete stage from the CMS workflow engine — not
            generic PSC phase names.
          </p>
        </div>
        {!isLoading && columns.length > 0 && (
          <div className="hidden lg:flex flex-wrap items-center gap-2 max-w-md justify-end">
            {columns.slice(0, 6).map((col) => (
              <Badge key={col.key} variant="secondary" className="text-xs">
                {col.label}: {col.items.length}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-none w-72 space-y-3">
              <Skeleton className="h-8 w-full rounded-lg" />
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-28 w-full rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      ) : columns.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No active cases"
          description="Open cases appear on the pipeline grouped by their current workflow stage."
        >
          <Button type="button" size="sm" onClick={() => navigate({ to: '/cases' })}>
            View cases
          </Button>
        </EmptyState>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-6 flex-1">
          {columns.map((col) => (
            <div key={col.key} className="flex-none w-72 flex flex-col gap-3">
              <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 shadow-sm">
                <span className="text-sm font-semibold leading-tight line-clamp-2 pr-2">
                  {col.label}
                </span>
                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground px-1.5">
                  {col.items.length}
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                {col.items.map((c) => (
                  <KanbanCard
                    key={c.id as number}
                    c={c}
                    onOpen={() =>
                      navigate({
                        to: '/cases/$id',
                        params: { id: String(c.id) },
                        search: { tab: 'stages' },
                      })
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
