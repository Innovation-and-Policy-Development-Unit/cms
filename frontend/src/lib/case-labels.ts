/** Shared case / SLA / portal labels — single source for UI (backend-driven later). */

export const CASE_FAMILIES = [
  { value: 'employee_disciplinary', label: 'Employee Internal Disciplinary' },
  { value: 'serious_misconduct_employee', label: 'Serious Misconduct — Employee' },
  { value: 'temporary_suspension', label: 'Temporary Suspension' },
  { value: 'grievance', label: 'Grievance Process' },
  { value: 'senior_serious_misconduct', label: 'Senior Executive — Serious Misconduct' },
  { value: 'senior_poor_performance', label: 'Senior Executive — Poor Performance' },
] as const

export const FAMILY_LABEL: Record<string, string> = Object.fromEntries(
  CASE_FAMILIES.map((f) => [f.value, f.label]),
)

/** Short labels for dense tables / kanban */
export const FAMILY_LABEL_SHORT: Record<string, string> = {
  employee_disciplinary: 'Employee Disciplinary',
  serious_misconduct_employee: 'Serious Misconduct',
  temporary_suspension: 'Temp. Suspension',
  grievance: 'Grievance',
  senior_serious_misconduct: 'Senior — Misconduct',
  senior_poor_performance: 'Senior — Performance',
}

export const CASE_STATUS_FILTER = [
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'closed', label: 'Closed' },
  { value: 'archived', label: 'Archived' },
] as const

export const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  active: 'default',
  on_hold: 'secondary',
  closed: 'outline',
  archived: 'outline',
}

export const SLA_VARIANT: Record<string, 'destructive' | 'warning' | 'success' | 'secondary'> = {
  overdue: 'destructive',
  at_risk: 'warning',
  on_track: 'success',
  completed: 'secondary',
}

export const SLA_LABEL: Record<string, string> = {
  overdue: 'Overdue',
  at_risk: 'At risk',
  on_track: 'On track',
  completed: 'Completed',
}

export function formatSlaStatus(status: string | undefined | null): string {
  if (!status) return '—'
  return SLA_LABEL[status] ?? status.replace(/_/g, ' ')
}

export const PORTAL_APPROVAL_FILTER = [
  { value: 'pending_manager', label: 'Pending Manager Approval' },
  { value: 'approved', label: 'Approved for Portal' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'sent_to_portal', label: 'Sent to Portal' },
] as const

export const PORTAL_APPROVAL_LABEL: Record<string, string> = Object.fromEntries(
  PORTAL_APPROVAL_FILTER.map((o) => [o.value, o.label]),
)

export const PORTAL_APPROVAL_VARIANT: Record<
  string,
  'default' | 'secondary' | 'warning' | 'success' | 'destructive' | 'info'
> = {
  draft: 'secondary',
  pending_manager: 'warning',
  approved: 'success',
  rejected: 'destructive',
  sent_to_portal: 'info',
}

export const STAGE_STATUS_VARIANT: Record<string, 'success' | 'info' | 'secondary'> = {
  completed: 'success',
  in_progress: 'info',
  pending: 'secondary',
}

/** Workflow stage responsible roles (workflow config UI) */
export const WORKFLOW_ROLE_LABELS: Record<string, string> = {
  compliance_unit: 'Compliance Unit',
  secretary_opsc: 'Secretary OPSC',
  commission_member: 'Commission',
  mdc_panel_mediator: 'MDC / Mediator',
  employee_subject: 'Subject / Employee',
  dg_director: 'DG / Director',
}

export const DECISION_OUTCOME_OPTIONS = [
  { value: 'reinstate', label: 'Reinstated' },
  { value: 'terminate', label: 'Terminated / Dismissed' },
  { value: 'warn', label: 'Formal Warning Issued' },
  { value: 'demote', label: 'Demotion' },
  { value: 'suspend_no_pay', label: 'Suspension Without Pay' },
  { value: 'compulsory_retire', label: 'Compulsory Retirement' },
  { value: 'no_action', label: 'No Further Action' },
  { value: 'settled', label: 'Settled (Grievance)' },
  { value: 'not_settled', label: 'Not Settled (Grievance)' },
] as const

export const DECISION_OUTCOME_LABEL: Record<string, string> = Object.fromEntries(
  DECISION_OUTCOME_OPTIONS.map((o) => [o.value, o.label]),
)

export function familyLabel(
  code: string | undefined | null,
  variant: 'full' | 'short' = 'full',
): string {
  if (!code) return '—'
  const map = variant === 'short' ? FAMILY_LABEL_SHORT : FAMILY_LABEL
  return map[code] ?? code.replace(/_/g, ' ')
}
