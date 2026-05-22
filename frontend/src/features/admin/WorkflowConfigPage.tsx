import { useState } from 'react'
import {
  ChevronDown, ChevronRight, Clock, Calendar, ShieldAlert,
  AlertTriangle, Info, CheckCircle2, SkipForward,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ── Role display helpers ──────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  compliance_unit:    'Compliance Unit',
  secretary_opsc:     'Secretary OPSC',
  commission_member:  'Commission',
  mdc_panel_mediator: 'MDC / Mediator',
  employee_subject:   'Subject / Employee',
  dg_director:        'DG / Director',
}

const ROLE_COLORS: Record<string, string> = {
  compliance_unit:    'bg-blue-100 text-blue-800',
  secretary_opsc:     'bg-purple-100 text-purple-800',
  commission_member:  'bg-amber-100 text-amber-800',
  mdc_panel_mediator: 'bg-teal-100 text-teal-800',
  employee_subject:   'bg-slate-100 text-slate-700',
  dg_director:        'bg-indigo-100 text-indigo-800',
}

// ── Statutory Workflow Definitions (mirrors backend workflow.py) ──────────────
interface StageDef {
  order: number
  name: string
  stage_code: string
  sla_days: number
  is_working_days: boolean
  responsible_role: string
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
}

function s(
  order: number, name: string, stage_code: string, sla_days: number,
  is_working_days: boolean, responsible_role: string, statutory_ref: string,
  description: string, is_optional = false,
): StageDef {
  return { order, name, stage_code, sla_days, is_working_days, responsible_role, statutory_ref, description, is_optional }
}

const WORKFLOWS: WorkflowDef[] = [
  // ── 1. Employee Internal Disciplinary ──────────────────────────────────────
  {
    family: 'Employee Internal Disciplinary',
    code:   'employee_disciplinary',
    color:  'border-blue-400',
    icon:   '📋',
    description: 'Internal Ministry-level disciplinary process for non-serious breaches of conduct.',
    stages: [
      s(1, 'Notice of Allegation Served',      'allegation_notice',    5,  true,  'compliance_unit',   'PSC Reg. 28(1)', 'Written notice of allegation served on the subject employee within 5 working days of case registration.'),
      s(2, 'Subject Response Period',           'subject_response',     5,  true,  'employee_subject',  'PSC Reg. 28(2)', 'Subject has 5 working days to lodge a written response to the allegation notice.'),
      s(3, 'Investigation Committee Appointed', 'committee_appointed',  5,  true,  'compliance_unit',   'PSC Reg. 29(1)', 'An Investigation Committee of three members is constituted within 5 working days of the response deadline.'),
      s(4, 'Investigation Conducted',           'investigation',        21, true,  'compliance_unit',   'PSC Reg. 29(2)', 'Committee conducts its investigation and interviews within 21 working days of appointment.'),
      s(5, 'Investigation Report Submitted',    'investigation_report', 5,  true,  'compliance_unit',   'PSC Reg. 30(1)', 'Committee submits a written report with findings and recommendations within 5 working days.'),
      s(6, 'Head of Department / PSC Decision', 'hod_decision',        10, true,  'secretary_opsc',    'PSC Reg. 31(1)', 'Appointing authority reviews the report and makes a disciplinary decision within 10 working days.'),
      s(7, 'Outcome Letter Issued to Subject',  'outcome_letter',      3,  true,  'compliance_unit',   'PSC Reg. 32(1)', 'Written outcome letter issued to the subject within 3 working days of the decision.'),
    ],
  },

  // ── 2. Serious Misconduct — Employee ──────────────────────────────────────
  {
    family: 'Serious Misconduct — Employee',
    code:   'serious_misconduct_employee',
    color:  'border-red-400',
    icon:   '⚠️',
    description: 'Formal PSC process for serious breaches of conduct that may warrant dismissal or major sanction.',
    stages: [
      s(1,  'Show-Cause Notice Issued',           'show_cause_notice',     2,  true,  'compliance_unit',   'PSC Reg. 33(1)', 'A show-cause notice is issued to the subject within 2 working days of the allegation being substantiated.'),
      s(2,  'Subject Show-Cause Response',        'show_cause_response',   5,  true,  'employee_subject',  'PSC Reg. 33(2)', 'Subject must provide a written response to the show-cause notice within 5 working days.'),
      s(3,  'Interim Suspension Decision',        'interim_suspension',    2,  true,  'secretary_opsc',    'PSC Reg. 34(1)', 'Appointing authority decides whether to impose interim suspension pending investigation.', true),
      s(4,  'Independent Investigator Appointed', 'investigator_appointed',5,  true,  'compliance_unit',   'PSC Reg. 35(1)', 'An independent investigator or panel is appointed within 5 working days of the show-cause deadline.'),
      s(5,  'Investigation Conducted',            'investigation',         30, true,  'compliance_unit',   'PSC Reg. 35(2)', 'Full disciplinary investigation conducted and completed within 30 working days of appointment.'),
      s(6,  'Investigation Report to OPSC',       'investigation_report',  5,  true,  'compliance_unit',   'PSC Reg. 36(1)', 'Investigator submits a written report with findings to the OPSC within 5 working days.'),
      s(7,  'PSC Preliminary Assessment',         'psc_assessment',        5,  true,  'secretary_opsc',    'PSC Reg. 37(1)', 'PSC conducts a preliminary review of the investigation report.'),
      s(8,  'PSDB Referral',                      'psdb_referral',         5,  true,  'secretary_opsc',    'PSC Reg. 38(1)', 'If the subject contests the findings, the matter may be referred to the PSDB.', true),
      s(9,  'Formal PSC / PSDB Hearing',          'psc_hearing',           10, true,  'secretary_opsc',    'PSC Reg. 39(1)', 'Formal hearing conducted where both parties present their case.'),
      s(10, 'PSC Decision & Sanction Issued',     'psc_decision',          5,  true,  'secretary_opsc',    'PSC Reg. 40(1)', 'PSC issues a written decision and applies the appropriate sanction within 5 working days of the hearing.'),
      s(11, 'Outcome Letter Issued to Subject',   'outcome_letter',        3,  true,  'compliance_unit',   'PSC Reg. 41(1)', 'Written outcome letter formally notifying the subject of the decision and sanction within 3 working days.'),
    ],
  },

  // ── 3. Temporary Suspension ────────────────────────────────────────────────
  {
    family: 'Temporary Suspension',
    code:   'temporary_suspension',
    color:  'border-orange-400',
    icon:   '⏸️',
    description: 'Precautionary suspension pending investigation or a disciplinary decision.',
    stages: [
      s(1, 'Suspension Order Issued',        'suspension_order',       1, true, 'secretary_opsc',    'PSC Reg. 43(1)', 'The appointing authority issues a written suspension order within 1 working day of the trigger event.'),
      s(2, 'Formal Allegation Notice Served','allegation_notice',      3, true, 'compliance_unit',   'PSC Reg. 43(2)', 'A formal notice of allegation detailing the grounds for suspension is served within 3 working days.'),
      s(3, 'Subject Response Period',        'subject_response',       5, true, 'employee_subject',  'PSC Reg. 44(1)', 'Subject has 5 working days to respond in writing to the formal allegation notice.'),
      s(4, 'Review by Appointing Authority', 'authority_review',       5, true, 'secretary_opsc',    'PSC Reg. 45(1)', 'The appointing authority reviews the subject\'s response and available evidence within 5 working days.'),
      s(5, 'Decision: Continue or Reinstate','continuation_decision',  3, true, 'secretary_opsc',    'PSC Reg. 46(1)', 'A formal decision is made to either continue the suspension and escalate, or reinstate the employee.'),
      s(6, 'Outcome Communicated to Subject','outcome_letter',         2, true, 'compliance_unit',   'PSC Reg. 47(1)', 'Written notice of the decision is communicated to the subject within 2 working days.'),
    ],
  },

  // ── 4. Grievance Process ───────────────────────────────────────────────────
  {
    family: 'Grievance Process',
    code:   'grievance',
    color:  'border-teal-400',
    icon:   '🤝',
    description: 'MDC-led conciliation and mediation process for workplace grievances.',
    stages: [
      s(1, 'Grievance Lodged & Acknowledged', 'grievance_lodged',   2,  true, 'compliance_unit',   'PSC Reg. 48(1)',               'Grievance formally received and an acknowledgement letter issued within 2 working days.'),
      s(2, 'MDC Assessment',                  'mdc_assessment',     5,  true, 'mdc_panel_mediator','PSC Reg. 49(1) / Empl. Act s.57','MDC conducts an initial assessment to determine the appropriate resolution pathway within 1 working week (5 days).'),
      s(3, 'Conciliation / Mediation',        'mediation',          21, true, 'mdc_panel_mediator','PSC Reg. 50(1)',               'MDC-facilitated mediation sessions conducted. Parties given up to 21 working days to reach a settlement.'),
      s(4, 'Mediation Outcome Documented',    'mediation_outcome',  3,  true, 'mdc_panel_mediator','PSC Reg. 51(1)',               'MDC mediator documents the outcome (settled or not settled) within 3 working days of the final session.'),
      s(5, 'Referral to PSDB (if unresolved)','psdb_referral',      5,  true, 'compliance_unit',   'PSC Reg. 52(1)',               'If mediation fails, the grievance is formally referred to the PSDB within 5 working days.', true),
      s(6, 'PSDB Hearing',                    'psdb_hearing',       14, true, 'secretary_opsc',    'PSC Reg. 53(1)',               'PSDB schedules and conducts a formal grievance hearing within 14 working days of referral.', true),
      s(7, 'PSDB Determination Issued',       'psdb_determination', 5,  true, 'secretary_opsc',    'PSC Reg. 54(1)',               'PSDB issues a written determination within 5 working days of the hearing.', true),
      s(8, 'Outcome Letter Issued',           'outcome_letter',     3,  true, 'compliance_unit',   'PSC Reg. 55(1)',               'Final outcome letter issued to all parties within 3 working days of the determination or settled mediation.'),
    ],
  },

  // ── 5. Senior Executive — Serious Misconduct ──────────────────────────────
  {
    family: 'Senior Executive — Serious Misconduct',
    code:   'senior_serious_misconduct',
    color:  'border-rose-500',
    icon:   '🏛️',
    description: 'Commission-level inquiry for serious misconduct by Directors-General, Directors, Secretary-Generals, Town Clerks, Auditors-General.',
    stages: [
      s(1,  'Allegation Referred to Commission',       'allegation_referral',     3,  true,  'compliance_unit',   'PSC Act s.22(1)', 'Allegation formally referred to the PSC/Commission within 3 working days of receipt.'),
      s(2,  'Commission Preliminary Assessment',       'commission_assessment',   10, true,  'commission_member', 'PSC Act s.22(2)', 'Commission conducts a preliminary assessment to determine whether the allegation warrants a formal inquiry. (2 working weeks)'),
      s(3,  'Notice of Allegation Issued to Executive','allegation_notice',       5,  true,  'secretary_opsc',    'PSC Act s.23(1)', 'Commission issues a formal notice of allegation to the senior executive within 5 working days of the assessment decision.'),
      s(4,  'Executive Response Period',               'executive_response',      5,  true,  'employee_subject',  'PSC Act s.23(2)', 'Senior executive has 5 working days to lodge a written response to the notice of allegation.'),
      s(5,  'Interim Suspension (if warranted)',        'interim_suspension',      3,  true,  'secretary_opsc',    'PSC Act s.24(1)', 'Commission may recommend interim suspension of the senior executive pending the inquiry outcome.', true),
      s(6,  'Independent Investigator Appointed',      'investigator_appointed',  5,  true,  'commission_member', 'PSC Act s.25(1)', 'Commission appoints an independent investigator or panel within 5 working days of the response deadline.'),
      s(7,  'Investigation Conducted',                 'investigation',           45, true,  'compliance_unit',   'PSC Act s.25(2)', 'Full independent investigation conducted within 45 working days of investigator appointment.'),
      s(8,  'Investigation Report to Commission',      'investigation_report',    5,  true,  'compliance_unit',   'PSC Act s.26(1)', 'Investigator submits the full report with findings to the Commission within 5 working days.'),
      s(9,  'Commission Deliberation',                 'commission_deliberation', 21, false, 'commission_member', 'PSC Act s.27(1)', 'Commission deliberates on the investigation report. Statutory period is 21 calendar days.'),
      s(10, 'Commission Determination Issued',         'commission_determination',10, true,  'commission_member', 'PSC Act s.27(2)', 'Commission issues its formal written determination including recommended sanction within 10 working days.'),
      s(11, 'Commission Confirmation Period',          'commission_confirmation', 45, false, 'commission_member', 'PSC Act s.28(1)', '45-calendar-day confirmation period during which the executive may appeal before the sanction takes effect.'),
      s(12, 'Referral to Minister / Prime Minister',   'ministerial_referral',    5,  true,  'secretary_opsc',    'PSC Act s.29(1)', 'If the sanction requires Ministerial or PM approval, Commission formally refers its determination within 5 working days.', true),
      s(13, 'Decision Implemented',                    'decision_implemented',    5,  true,  'compliance_unit',   'PSC Act s.29(2)', 'Commission\'s decision formally implemented and the executive notified in writing within 5 working days.'),
    ],
  },

  // ── 6. Senior Executive — Poor Performance ────────────────────────────────
  {
    family: 'Senior Executive — Poor Performance',
    code:   'senior_poor_performance',
    color:  'border-amber-400',
    icon:   '📈',
    description: 'Performance Improvement Plan (PIP) process for senior executives failing to meet required performance standards.',
    stages: [
      s(1,  'Performance Concerns Documented',     'performance_concerns',      5,  true,  'compliance_unit',   'PSC Act s.30(1)', 'Supervisor formally documents specific performance concerns within 5 working days of concern identification.'),
      s(2,  'Performance Improvement Notice Issued','pip_notice',               3,  true,  'secretary_opsc',    'PSC Act s.30(2)', 'Formal Performance Improvement Notice issued to the senior executive within 3 working days.'),
      s(3,  'PIP Plan Agreed & Commenced',         'pip_commenced',             10, true,  'compliance_unit',   'PSC Act s.31(1)', 'A PIP with measurable targets is agreed and formally commenced within 10 working days of the notice.'),
      s(4,  'PIP Monitoring Period',               'pip_monitoring',            90, false, 'compliance_unit',   'PSC Act s.31(2)', 'Executive given 90 calendar days (~3 months) to demonstrate measurable improvement against PIP targets.'),
      s(5,  'PIP Review Assessment',               'pip_review',                10, true,  'compliance_unit',   'PSC Act s.32(1)', 'Formal review assessment conducted at the end of the PIP period within 10 working days of PIP expiry.'),
      s(6,  'Commission Assessment',               'commission_assessment',     10, true,  'commission_member', 'PSC Act s.33(1)', 'If performance has not improved, matter referred to the Commission for a formal assessment within 10 working days.'),
      s(7,  'PSDB Assessment (if contested)',      'psdb_assessment',           10, true,  'secretary_opsc',    'PSC Act s.34(1)', 'If the executive contests the poor performance finding, matter reviewed by PSDB within 10 working days.', true),
      s(8,  'Commission Recommendation to Minister','commission_recommendation', 10, true,  'commission_member', 'PSC Act s.35(1)', 'Commission prepares and submits its formal recommendation to the relevant Minister within 10 working days.'),
      s(9,  'Ministerial Decision',                'ministerial_decision',      21, false, 'secretary_opsc',    'PSC Act s.36(1)', 'The Minister has 21 calendar days to accept, modify, or reject the Commission\'s recommendation.'),
      s(10, 'Commission Confirmation Period',      'commission_confirmation',   45, false, 'commission_member', 'PSC Act s.37(1)', '45-calendar-day Commission confirmation period before the Ministerial decision takes formal effect.'),
      s(11, 'Decision Implemented',               'decision_implemented',       5,  true,  'compliance_unit',   'PSC Act s.38(1)', 'Final decision formally implemented and executive notified in writing within 5 working days.'),
    ],
  },
]

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
                        {ROLE_LABELS[stage.responsible_role] ?? stage.responsible_role}
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
  const totalStages     = WORKFLOWS.reduce((a, w) => a + w.stages.length, 0)
  const mandatoryStages = WORKFLOWS.reduce((a, w) => a + w.stages.filter(s => !s.is_optional).length, 0)
  const totalWD         = WORKFLOWS.reduce((a, w) =>
    a + w.stages.filter(s => s.is_working_days).reduce((b, s) => b + s.sla_days, 0), 0)
  const totalCD         = WORKFLOWS.reduce((a, w) =>
    a + w.stages.filter(s => !s.is_working_days).reduce((b, s) => b + s.sla_days, 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Workflow Configuration</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Statutory workflow stages and SLA deadlines defined under the PSC Act and PSC Regulations.
          All working-day deadlines exclude Saturday and Sunday. These definitions are read-only —
          contact the OPSC Secretary to amend procedural timelines.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Case Families"    value={WORKFLOWS.length}   sub="Procedural families" />
        <KpiCard label="Total Stages"     value={totalStages}        sub={`${mandatoryStages} mandatory`} />
        <KpiCard label="Working-Day SLAs" value={`${totalWD} wd`}   sub="Across all families" />
        <KpiCard label="Calendar-Day SLAs" value={`${totalCD} d`}   sub="Confirmations & PIPs" />
      </div>

      {/* Legend */}
      <Legend />

      {/* Workflow cards */}
      <div className="space-y-4">
        {WORKFLOWS.map((wf) => (
          <WorkflowCard key={wf.code} wf={wf} />
        ))}
      </div>

      {/* Footer note */}
      <p className="text-[11px] text-muted-foreground text-center pb-2">
        Statutory references: PSC Act (Cap. 246) · PSC Regulations 2020 · Employment Act (Cap. 160) · IPDU-SOP-001 v2.0
      </p>
    </div>
  )
}
