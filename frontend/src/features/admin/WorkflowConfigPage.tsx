import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronDown, ChevronRight, Clock, Calendar, ShieldAlert,
  AlertTriangle, Info, CheckCircle2, SkipForward,
} from 'lucide-react'
import { workflowAPI } from '@/api/ccms'
import { AdminReferenceBanner } from '@/components/admin/AdminReferenceBanner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ── Role display helpers ──────────────────────────────────────────────────────
import { WORKFLOW_ROLE_LABELS } from '@/lib/case-labels'

const ROLE_COLORS: Record<string, string> = {
  compliance_unit:    'bg-blue-100 text-blue-800',
  secretary_opsc:     'bg-purple-100 text-purple-800',
  commission_member:  'bg-amber-100 text-amber-800',
  mdc_panel_mediator: 'bg-teal-100 text-teal-800',
  employee_subject:   'bg-slate-100 text-slate-700',
  dg_director:        'bg-indigo-100 text-indigo-800',
}

/** Statutory stages from GET /api/v1/workflow-templates/ (source: apps.cases.workflow) */
interface StageDef {
  order: number
  name: string
  stage_code: string
  sla_days: number
  is_working_days: boolean
  responsible_role: string
  responsible_role_label?: string
  statutory_ref: string
  description: string
  is_optional?: boolean
}

interface WorkflowDef {
  family: string
  code: string
  color: string
  icon: string
  description: string
  stages: StageDef[]
  read_only?: boolean
  source?: string
}

function roleLabel(stage: StageDef) {
  return stage.responsible_role_label ?? WORKFLOW_ROLE_LABELS[stage.responsible_role] ?? stage.responsible_role
}

// ── Computed summary helpers ──────────────────────────────────────────────────

function slaChip(days: number, working: boolean) {
  const urgent = working ? days <= 5 : days <= 14
  const moderate = working ? days <= 14 : days <= 30
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
      urgent   ? 'bg-red-100 text-red-700'    :
      moderate ? 'bg-amber-100 text-amber-700' :
                 'bg-green-100 text-green-700',
    )}>
      {working ? <Clock className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
      {days}{working ? 'wd' : 'd'}
    </span>
  )
}

function WorkflowSummaryBar({ wf }: { wf: WorkflowDef }) {
  const mandatory = wf.stages.filter(s => !s.is_optional)
  const optional  = wf.stages.filter(s => s.is_optional)
  const mandWD = mandatory.filter(s => s.is_working_days).reduce((a, s) => a + s.sla_days, 0)
  const mandCD = mandatory.filter(s => !s.is_working_days).reduce((a, s) => a + s.sla_days, 0)
  const optWD  = optional.filter(s => s.is_working_days).reduce((a, s) => a + s.sla_days, 0)
  const optCD  = optional.filter(s => !s.is_working_days).reduce((a, s) => a + s.sla_days, 0)

  return (
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1">
        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
        <strong className="text-foreground">{mandatory.length}</strong> mandatory stages
      </span>
      {optional.length > 0 && (
        <span className="flex items-center gap-1">
          <SkipForward className="h-3.5 w-3.5 text-slate-400" />
          <strong className="text-foreground">{optional.length}</strong> optional
        </span>
      )}
      <span className="flex items-center gap-1">
        <Clock className="h-3.5 w-3.5 text-blue-500" />
        <strong className="text-foreground">{mandWD}{optWD > 0 ? `+${optWD}` : ''}</strong> working days
      </span>
      {(mandCD + optCD) > 0 && (
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5 text-purple-500" />
          <strong className="text-foreground">{mandCD}{optCD > 0 ? `+${optCD}` : ''}</strong> calendar days
        </span>
      )}
    </div>
  )
}

// ── Single workflow card ──────────────────────────────────────────────────────

function WorkflowCard({ wf }: { wf: WorkflowDef }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className={cn('border-l-4 transition-shadow hover:shadow-md', wf.color)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <span className="text-xl leading-none mt-0.5">{wf.icon}</span>
            <div>
              <CardTitle className="text-sm font-semibold leading-snug">{wf.family}</CardTitle>
              <p className="mt-0.5 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">{wf.code}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs shrink-0"
            onClick={() => setExpanded(v => !v)}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {expanded ? 'Collapse' : 'View Stages'}
          </Button>
        </div>

        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{wf.description}</p>
        <div className="mt-2">
          <WorkflowSummaryBar wf={wf} />
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          <div className="relative mt-2 space-y-0">
            {wf.stages.map((stage, idx) => {
              const isLast = idx === wf.stages.length - 1
              return (
                <div key={stage.stage_code} className="flex gap-3">
                  {/* Timeline spine */}
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ring-2',
                      stage.is_optional
                        ? 'bg-slate-100 text-slate-500 ring-slate-200'
                        : 'bg-primary/10 text-primary ring-primary/20',
                    )}>
                      {stage.order}
                    </div>
                    {!isLast && <div className="w-px flex-1 bg-border my-1" />}
                  </div>

                  {/* Stage content */}
                  <div className={cn(
                    'flex-1 rounded-lg border p-3 mb-2',
                    stage.is_optional ? 'border-dashed bg-muted/30' : 'bg-card',
                  )}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium leading-snug">{stage.name}</span>
                        {stage.is_optional && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-dashed text-muted-foreground">
                            optional
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {slaChip(stage.sla_days, stage.is_working_days)}
                      </div>
                    </div>

                    <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                      {stage.description}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {/* Responsible role */}
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                        ROLE_COLORS[stage.responsible_role] ?? 'bg-slate-100 text-slate-600',
                      )}>
                        {roleLabel(stage)}
                      </span>

                      {/* Statutory reference */}
                      <span className="inline-flex items-center gap-1 rounded bg-slate-50 border px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
                        <ShieldAlert className="h-2.5 w-2.5" />
                        {stage.statutory_ref}
                      </span>

                      {/* SLA type explainer */}
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                        {stage.is_working_days
                          ? <><Clock className="h-2.5 w-2.5" /> Working days (Mon–Fri)</>
                          : <><Calendar className="h-2.5 w-2.5" /> Calendar days</>}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// ── KPI summary row ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Legend ────────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <Card className="bg-muted/30">
      <CardContent className="pt-4 pb-3">
        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Legend</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-4 text-xs">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-blue-500" />
            <span><strong>wd</strong> = working days (Mon–Fri)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-purple-500" />
            <span><strong>d</strong> = calendar days</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-200 ring-1 ring-red-300" />
            <span>≤ 5wd — urgent SLA</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border-dashed border border-slate-300" />
            <span>dashed border = optional stage</span>
          </span>
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            <span>≤ 14wd — moderate SLA</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-slate-400" />
            <span>Optional stages may be skipped</span>
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5 text-slate-500" />
            <span>Statutory citation shown on each stage</span>
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            <span>Mandatory stage — cannot be skipped</span>
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WorkflowConfigPage() {
  const { data: workflows = [], isLoading, isError } = useQuery({
    queryKey: ['workflow-templates'],
    queryFn: () => workflowAPI.list().then((r) => r.data as WorkflowDef[]),
  })

  const totalStages = workflows.reduce((a, w) => a + w.stages.length, 0)
  const mandatoryStages = workflows.reduce(
    (a, w) => a + w.stages.filter((s) => !s.is_optional).length,
    0,
  )
  const totalWD = workflows.reduce(
    (a, w) => a + w.stages.filter((s) => s.is_working_days).reduce((b, s) => b + s.sla_days, 0),
    0,
  )
  const totalCD = workflows.reduce(
    (a, w) => a + w.stages.filter((s) => !s.is_working_days).reduce((b, s) => b + s.sla_days, 0),
    0,
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Workflow Configuration</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Statutory workflow stages and SLA deadlines from the CMS workflow engine (read-only).
        </p>
      </div>

      <AdminReferenceBanner title="Read-only statutory reference">
        Stages and SLAs are loaded from <code className="font-mono text-[11px]">apps.cases.workflow</code> via the API.
        New cases receive these stages automatically; timelines are not editable in this UI.
        To change definitions, update the backend workflow module and redeploy.
      </AdminReferenceBanner>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">Could not load workflow definitions.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard label="Case Families" value={workflows.length} sub="Procedural families" />
            <KpiCard label="Total Stages" value={totalStages} sub={`${mandatoryStages} mandatory`} />
            <KpiCard label="Working-Day SLAs" value={`${totalWD} wd`} sub="Across all families" />
            <KpiCard label="Calendar-Day SLAs" value={`${totalCD} d`} sub="Confirmations & PIPs" />
          </div>

          <Legend />

          <div className="space-y-4">
            {workflows.map((wf) => (
              <WorkflowCard key={wf.code} wf={wf} />
            ))}
          </div>
        </>
      )}

      <p className="text-[11px] text-muted-foreground text-center pb-2">
        Source: {workflows[0]?.source ?? 'apps.cases.workflow'} · PSC Act · PSC Regulations
      </p>
    </div>
  )
}
