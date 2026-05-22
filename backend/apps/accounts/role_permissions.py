# Single source of truth: which app-level permission keys each role holds.
# These keys mirror the PERMISSIONS map in frontend/src/lib/permissions.ts.

ROLE_PERMISSIONS: dict[str, list[str]] = {
    'superadmin': [
        'adminSection', 'createCase', 'editCaseMetadata', 'fullCaseList',
        'reportsAccess', 'auditTrail', 'caseAuditTab', 'recordDecision',
        'closeCase', 'reopenCase', 'completeStage', 'createTask',
        'litigationTab', 'decisionsTab', 'activeWorkflows',
        'uploadDocs', 'deleteDocs', 'internalNotes', 'exportReports',
    ],
    'admin': [
        'adminSection', 'createCase', 'editCaseMetadata', 'fullCaseList',
        'reportsAccess', 'auditTrail', 'caseAuditTab', 'recordDecision',
        'closeCase', 'reopenCase', 'completeStage', 'createTask',
        'litigationTab', 'decisionsTab', 'activeWorkflows',
        'uploadDocs', 'deleteDocs', 'internalNotes', 'exportReports',
    ],
    'compliance_unit': [
        'createCase', 'editCaseMetadata', 'fullCaseList',
        'reportsAccess', 'auditTrail', 'caseAuditTab', 'recordDecision',
        'closeCase', 'reopenCase', 'completeStage', 'createTask',
        'litigationTab', 'decisionsTab', 'activeWorkflows',
        'uploadDocs', 'deleteDocs', 'internalNotes', 'exportReports',
    ],
    'compliance_senior': [
        'createCase', 'editCaseMetadata', 'fullCaseList',
        'reportsAccess', 'auditTrail', 'caseAuditTab', 'recordDecision',
        'closeCase', 'completeStage', 'createTask',
        'litigationTab', 'decisionsTab', 'activeWorkflows',
        'uploadDocs', 'deleteDocs', 'internalNotes', 'exportReports',
    ],
    'compliance_principal': [
        'createCase', 'editCaseMetadata', 'fullCaseList',
        'reportsAccess', 'auditTrail', 'caseAuditTab', 'recordDecision',
        'closeCase', 'completeStage', 'createTask',
        'litigationTab', 'decisionsTab', 'activeWorkflows',
        'uploadDocs', 'deleteDocs', 'internalNotes', 'exportReports',
    ],
    'compliance_manager': [
        'createCase', 'editCaseMetadata', 'fullCaseList',
        'reportsAccess', 'auditTrail', 'caseAuditTab', 'recordDecision',
        'closeCase', 'reopenCase', 'completeStage', 'createTask',
        'litigationTab', 'decisionsTab', 'activeWorkflows',
        'uploadDocs', 'deleteDocs', 'internalNotes', 'exportReports',
    ],
    'secretary_opsc': [
        'createCase', 'editCaseMetadata', 'fullCaseList',
        'reportsAccess', 'auditTrail', 'caseAuditTab', 'recordDecision',
        'closeCase', 'reopenCase', 'completeStage', 'createTask',
        'litigationTab', 'decisionsTab', 'activeWorkflows',
        'uploadDocs', 'deleteDocs', 'internalNotes', 'exportReports',
    ],
    'commission_member': [
        'reportsAccess', 'caseAuditTab', 'recordDecision',
        'closeCase', 'completeStage', 'litigationTab',
        'decisionsTab', 'activeWorkflows', 'uploadDocs',
    ],
    'dg_director': [
        'createCase', 'completeStage', 'decisionsTab',
        'activeWorkflows', 'uploadDocs',
    ],
    'mdc_panel_mediator': [
        'completeStage', 'decisionsTab', 'activeWorkflows', 'uploadDocs',
    ],
    'employee_subject': [
        'completeStage', 'decisionsTab', 'uploadDocs',
    ],
}


def get_permissions_for_role(role: str) -> list[str]:
    return ROLE_PERMISSIONS.get(role, [])
