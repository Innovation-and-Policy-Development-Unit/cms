"""
Role-based case list scoping — must match frontend scope banners on CaseListPage.
"""

from django.db.models import Q, QuerySet

from apps.accounts.models import User

from .models import Case, CaseFamily, CaseStage, StageStatus

# Roles that see the full case registry (no queryset restriction).
FULL_LIST_ROLES = frozenset({
    User.Role.SUPERADMIN,
    User.Role.ADMIN,
    User.Role.COMPLIANCE_MANAGER,
    User.Role.COMPLIANCE_SENIOR,
    User.Role.COMPLIANCE_PRINCIPAL,
    User.Role.COMPLIANCE_UNIT,
    User.Role.SECRETARY_OPSC,
})

SENIOR_CASE_FAMILIES = (
    CaseFamily.SENIOR_SERIOUS_MISCONDUCT,
    CaseFamily.SENIOR_POOR_PERFORMANCE,
)


def cases_visible_to_user(user: User, queryset: QuerySet | None = None) -> QuerySet:
    """Return cases the authenticated user may list or retrieve."""
    qs = queryset if queryset is not None else Case.objects.all()
    role = getattr(user, 'role', None)

    if not user.is_authenticated:
        return qs.none()

    if role in FULL_LIST_ROLES:
        return qs

    if role == User.Role.EMPLOYEE_SUBJECT:
        full_name = user.get_full_name().strip()
        if not full_name:
            return qs.none()
        return qs.filter(subject_name__iexact=full_name)

    if role == User.Role.DG_DIRECTOR:
        dept = (user.department or '').strip()
        if not dept:
            return qs.none()
        return qs.filter(subject_ministry__iexact=dept)

    if role == User.Role.MDC_PANEL_MEDIATOR:
        return qs.filter(
            Q(assigned_officer=user)
            | Q(stages__assigned_officer=user)
        ).distinct()

    if role == User.Role.COMMISSION_MEMBER:
        return qs.filter(
            Q(is_senior_executive=True) | Q(case_family__in=SENIOR_CASE_FAMILIES),
            stages__responsible_role=User.Role.COMMISSION_MEMBER,
            stages__status__in=[StageStatus.IN_PROGRESS, StageStatus.COMPLETED],
        ).distinct()

    # Unknown / future roles — deny by default rather than leak all cases.
    return qs.none()


def case_scope_description(role: str | None) -> str | None:
    """Human-readable scope line for API/docs; mirrors CaseListPage banners."""
    messages = {
        User.Role.EMPLOYEE_SUBJECT: (
            'Showing cases where the subject name matches your account name.'
        ),
        User.Role.DG_DIRECTOR: (
            'Showing cases where the subject ministry matches your profile department.'
        ),
        User.Role.MDC_PANEL_MEDIATOR: (
            'Showing cases where you are the case or stage assignee.'
        ),
        User.Role.COMMISSION_MEMBER: (
            'Showing senior executive cases with a Commission stage in progress or completed.'
        ),
    }
    return messages.get(role or '')
