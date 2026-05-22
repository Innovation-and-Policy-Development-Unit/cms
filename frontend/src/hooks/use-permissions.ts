import { useAuthStore } from '@/stores/authStore'
import { can, isComplianceRole, mayUsePsaForm, type Permission, type UserRole } from '@/lib/permissions'

export function usePermissions() {
  const { user } = useAuthStore()
  const role = user?.role as UserRole | undefined

  return {
    role,
    /** Check a named permission for the current user */
    can: (permission: Permission) => can(role, permission),

    // ── Navigation / page access ──────────────────────────────
    isAdmin:            can(role, 'adminSection'),
    canSeeFullList:     can(role, 'fullCaseList'),
    canSeeReports:      can(role, 'reportsAccess'),
    canSeeAuditTrail:   can(role, 'auditTrail'),
    canSeeWorkflows:    can(role, 'activeWorkflows'),

    // ── Case actions ──────────────────────────────────────────
    canCreateCase:      can(role, 'createCase'),
    canEditMetadata:    can(role, 'editCaseMetadata'),
    canCloseCase:       can(role, 'closeCase'),
    canReopenCase:      can(role, 'reopenCase'),

    // ── Stage / task actions ──────────────────────────────────
    canCompleteStage:   can(role, 'completeStage'),
    canCreateTask:      can(role, 'createTask'),

    // ── Decision actions ──────────────────────────────────────
    canRecordDecision:  can(role, 'recordDecision'),

    // ── Document actions ──────────────────────────────────────
    canUploadDocs:      can(role, 'uploadDocs'),
    canDeleteDocs:      can(role, 'deleteDocs'),

    // ── Case detail tabs ──────────────────────────────────────
    canSeeAuditTab:     can(role, 'caseAuditTab'),
    canSeeDecisions:    can(role, 'decisionsTab'),
    canSeeLitigation:   can(role, 'litigationTab'),
    canSeeInternalNotes:can(role, 'internalNotes'),

    // ── Reports ───────────────────────────────────────────────
    canExportReports:   can(role, 'exportReports'),

    canApprovePortal:   can(role, 'approvePortal'),

    // ── Role shorthands ───────────────────────────────────────
    isEmployee:         role === 'employee_subject',
    isDG:               role === 'dg_director',
    isCommission:       role === 'commission_member',
    isMDC:              role === 'mdc_panel_mediator',
    isCompliance:       isComplianceRole(role),
    isComplianceManager: role === 'compliance_manager' || role === 'superadmin' || role === 'admin',
    isComplianceSeniorPrincipal:
      role === 'compliance_senior' || role === 'compliance_principal' || role === 'compliance_unit',
    mayUsePsaForm:      mayUsePsaForm(role),
  }
}
