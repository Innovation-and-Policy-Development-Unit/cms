/* ─── Role definitions ───────────────────────────────────────────────────── */
export type UserRole =
  | 'superadmin'
  | 'admin'
  | 'compliance_manager'
  | 'compliance_senior'
  | 'compliance_principal'
  | 'compliance_unit'
  | 'secretary_opsc'
  | 'commission_member'
  | 'dg_director'
  | 'mdc_panel_mediator'
  | 'employee_subject'

export const ROLE_LABELS: Record<string, string> = {
  superadmin:           'Super Admin',
  admin:                'Admin',
  compliance_manager:   'Compliance Manager',
  compliance_senior:    'Compliance Senior',
  compliance_principal: 'Compliance Principal',
  compliance_unit:      'Compliance Unit',
  secretary_opsc:       'Secretary OPSC',
  commission_member:    'Commission Member',
  dg_director:          'DG / Director',
  mdc_panel_mediator:   'MDC / Panel / Mediator',
  employee_subject:     'Employee / Subject',
}

const COMPLIANCE_ROLES = new Set([
  'compliance_manager', 'compliance_senior', 'compliance_principal', 'compliance_unit',
])
const COMPLIANCE_PSA_ROLES = new Set(['compliance_principal', 'compliance_manager', 'superadmin', 'admin'])

/* ─── Permission sets (role-based) ──────────────────────────────────────── */

const ADMIN_SECTION      = new Set<string>(['superadmin', 'admin'])
const COMPLIANCE_STAFF = [...COMPLIANCE_ROLES]
const CREATE_CASE        = new Set<string>(['superadmin', 'admin', ...COMPLIANCE_STAFF, 'secretary_opsc', 'dg_director'])
const EDIT_CASE_METADATA = new Set<string>(['superadmin', 'admin', ...COMPLIANCE_STAFF, 'secretary_opsc'])
const FULL_CASE_LIST     = new Set<string>(['superadmin', 'admin', ...COMPLIANCE_STAFF, 'secretary_opsc'])
const REPORTS_ACCESS     = new Set<string>(['superadmin', 'admin', ...COMPLIANCE_STAFF, 'secretary_opsc', 'commission_member'])
const AUDIT_TRAIL        = new Set<string>(['superadmin', 'admin', ...COMPLIANCE_STAFF, 'secretary_opsc'])
const CASE_AUDIT_TAB     = new Set<string>(['superadmin', 'admin', ...COMPLIANCE_STAFF, 'secretary_opsc', 'commission_member'])
const RECORD_DECISION    = new Set<string>(['superadmin', 'admin', ...COMPLIANCE_STAFF, 'secretary_opsc', 'commission_member'])
const CLOSE_CASE         = new Set<string>(['superadmin', 'admin', ...COMPLIANCE_STAFF, 'secretary_opsc', 'commission_member'])
const REOPEN_CASE        = new Set<string>(['superadmin', 'admin', 'compliance_manager', 'compliance_unit', 'secretary_opsc'])
const COMPLETE_STAGE     = new Set<string>([
  'superadmin', 'admin', ...COMPLIANCE_STAFF, 'secretary_opsc',
  'commission_member', 'dg_director', 'mdc_panel_mediator', 'employee_subject',
])
const CREATE_TASK        = new Set<string>(['superadmin', 'admin', ...COMPLIANCE_STAFF, 'secretary_opsc'])
const LITIGATION_TAB     = new Set<string>(['superadmin', 'admin', ...COMPLIANCE_STAFF, 'secretary_opsc', 'commission_member'])
const DECISIONS_TAB      = new Set<string>([
  'superadmin', 'admin', ...COMPLIANCE_STAFF, 'secretary_opsc',
  'commission_member', 'dg_director', 'mdc_panel_mediator', 'employee_subject',
])
const ACTIVE_WORKFLOWS   = new Set<string>([
  'superadmin', 'admin', ...COMPLIANCE_STAFF, 'secretary_opsc',
  'commission_member', 'dg_director', 'mdc_panel_mediator',
])
const UPLOAD_DOCS        = new Set<string>([
  'superadmin', 'admin', ...COMPLIANCE_STAFF, 'secretary_opsc',
  'commission_member', 'dg_director', 'mdc_panel_mediator', 'employee_subject',
])
const DELETE_DOCS        = new Set<string>(['superadmin', 'admin', ...COMPLIANCE_STAFF, 'secretary_opsc'])
const INTERNAL_NOTES     = new Set<string>(['superadmin', 'admin', ...COMPLIANCE_STAFF, 'secretary_opsc'])
const EXPORT_REPORTS     = new Set<string>(['superadmin', 'admin', ...COMPLIANCE_STAFF, 'secretary_opsc'])
const APPROVE_PORTAL     = new Set<string>(['superadmin', 'admin', 'compliance_manager'])

/* ─── Permission map ─────────────────────────────────────────────────────── */
const PERMISSIONS = {
  adminSection:      ADMIN_SECTION,
  createCase:        CREATE_CASE,
  editCaseMetadata:  EDIT_CASE_METADATA,
  fullCaseList:      FULL_CASE_LIST,
  reportsAccess:     REPORTS_ACCESS,
  auditTrail:        AUDIT_TRAIL,
  caseAuditTab:      CASE_AUDIT_TAB,
  recordDecision:    RECORD_DECISION,
  closeCase:         CLOSE_CASE,
  reopenCase:        REOPEN_CASE,
  completeStage:     COMPLETE_STAGE,
  createTask:        CREATE_TASK,
  litigationTab:     LITIGATION_TAB,
  decisionsTab:      DECISIONS_TAB,
  activeWorkflows:   ACTIVE_WORKFLOWS,
  uploadDocs:        UPLOAD_DOCS,
  deleteDocs:        DELETE_DOCS,
  internalNotes:     INTERNAL_NOTES,
  exportReports:     EXPORT_REPORTS,
  approvePortal:     APPROVE_PORTAL,
} as const

export function isComplianceRole(role: string | undefined): boolean {
  return COMPLIANCE_ROLES.has(role ?? '')
}

export function mayUsePsaForm(role: string | undefined): boolean {
  return COMPLIANCE_PSA_ROLES.has(role ?? '')
}

export type Permission = keyof typeof PERMISSIONS

/* ─── Role-based check (used in router guards) ───────────────────────────── */
export function can(role: string | undefined, permission: Permission): boolean {
  return PERMISSIONS[permission].has(role ?? '')
}

/* ─── Permission-array check (used in components) ───────────────────────── */
export function hasPermission(permissions: string[] | undefined, permission: Permission): boolean {
  return permissions?.includes(permission) ?? false
}

/* ─── Derive full permission list for a role (mirrors backend role_permissions.py) */
export function getPermissionsForRole(role: string): Permission[] {
  return (Object.keys(PERMISSIONS) as Permission[]).filter((p) =>
    PERMISSIONS[p].has(role)
  )
}
