"""
Compliance submission approval and portal registration rules.

Operating model (CMS ↔ SCDMS): docs/CMS-SCDMS-operating-model.md
"""

from apps.accounts.models import User

# Portal COMP-* codes (must match SCDMS compliance_forms.py)
COMP_FORM_TYPES = (
    'COMP-SMDR',
    'COMP-PAR',
    'COMP-PSDB',
    'COMP-14D',
    'COMP-OMB',
    'COMP-PSA',
)

PSA_FORM = 'COMP-PSA'

COMPLIANCE_CREATOR_ROLES = {
    User.Role.COMPLIANCE_SENIOR,
    User.Role.COMPLIANCE_PRINCIPAL,
    User.Role.COMPLIANCE_MANAGER,
    User.Role.COMPLIANCE_UNIT,
}

MANAGER_ROLES = {
    User.Role.COMPLIANCE_MANAGER,
    User.Role.SUPERADMIN,
    User.Role.ADMIN,
}

SENIOR_PRINCIPAL_ROLES = {
    User.Role.COMPLIANCE_SENIOR,
    User.Role.COMPLIANCE_PRINCIPAL,
    User.Role.COMPLIANCE_UNIT,
}


class PortalApprovalStatus:
    DRAFT = 'draft'
    PENDING_MANAGER = 'pending_manager'
    APPROVED = 'approved'
    REJECTED = 'rejected'
    SENT_TO_PORTAL = 'sent_to_portal'


def is_compliance_role(role: str) -> bool:
    return role in {r.value for r in COMPLIANCE_CREATOR_ROLES}


def requires_manager_approval(role: str) -> bool:
    return role in {r.value for r in SENIOR_PRINCIPAL_ROLES}


def can_approve_portal_submission(user) -> bool:
    return getattr(user, 'role', '') in {r.value for r in MANAGER_ROLES}


def assert_may_use_form_type(role: str, form_type_code: str) -> None:
    if form_type_code not in COMP_FORM_TYPES:
        raise ValueError(f'Unknown portal form type: {form_type_code}')
    if form_type_code == PSA_FORM and role not in {
        User.Role.COMPLIANCE_PRINCIPAL.value,
        User.Role.COMPLIANCE_MANAGER.value,
        User.Role.SUPERADMIN.value,
        User.Role.ADMIN.value,
    }:
        raise ValueError(
            'Proposed Amendment to the Public Service Act is limited to Compliance Principal and Manager.'
        )


def initial_approval_status_for_role(role: str) -> str:
    if role in {r.value for r in MANAGER_ROLES}:
        return PortalApprovalStatus.APPROVED
    if requires_manager_approval(role):
        return PortalApprovalStatus.PENDING_MANAGER
    return PortalApprovalStatus.DRAFT
