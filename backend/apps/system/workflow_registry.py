"""Expose statutory workflows from apps.cases.workflow as API-ready structures."""

from apps.cases.models import CaseFamily
from apps.cases.workflow import get_stages_for_family, get_total_sla_summary

ROLE_LABELS = {
    'compliance_unit': 'Compliance Unit',
    'compliance_senior': 'Compliance Senior',
    'compliance_principal': 'Compliance Principal',
    'compliance_manager': 'Compliance Manager',
    'secretary_opsc': 'Secretary OPSC',
    'commission_member': 'Commission',
    'mdc_panel_mediator': 'MDC / Panel / Mediator',
    'employee_subject': 'Subject / Employee',
    'dg_director': 'DG / Director',
}

WORKFLOW_FAMILY_META = {
    CaseFamily.EMPLOYEE_DISCIPLINARY: {
        'icon': '📋',
        'color': 'border-blue-400',
        'description': 'Internal Ministry-level disciplinary process for non-serious breaches of conduct.',
    },
    CaseFamily.SERIOUS_MISCONDUCT_EMPLOYEE: {
        'icon': '⚠️',
        'color': 'border-red-400',
        'description': 'Formal PSC process for serious breaches that may warrant dismissal or major sanction.',
    },
    CaseFamily.TEMPORARY_SUSPENSION: {
        'icon': '⏸️',
        'color': 'border-orange-400',
        'description': 'Precautionary suspension pending investigation or a disciplinary decision.',
    },
    CaseFamily.GRIEVANCE: {
        'icon': '⚖️',
        'color': 'border-emerald-400',
        'description': 'Formal grievance lodgment, investigation, and resolution under PSC grievance rules.',
    },
    CaseFamily.SENIOR_SERIOUS_MISCONDUCT: {
        'icon': '🏛️',
        'color': 'border-violet-400',
        'description': 'Senior executive serious misconduct referred to the Public Service Commission.',
    },
    CaseFamily.SENIOR_POOR_PERFORMANCE: {
        'icon': '📉',
        'color': 'border-sky-400',
        'description': 'Senior executive poor performance improvement and confirmation process.',
    },
}


def build_workflow_payload(code: str) -> dict | None:
    stages = get_stages_for_family(code)
    if not stages:
        return None
    meta = WORKFLOW_FAMILY_META.get(code, {})
    try:
        family_label = CaseFamily(code).label
    except ValueError:
        family_label = code.replace('_', ' ').title()

    enriched_stages = []
    for st in stages:
        enriched_stages.append({
            **st,
            'responsible_role_label': ROLE_LABELS.get(st['responsible_role'], st['responsible_role']),
            'sla_unit': 'working days' if st['is_working_days'] else 'calendar days',
        })

    return {
        'code': code,
        'family': family_label,
        'description': meta.get('description', ''),
        'icon': meta.get('icon', '📁'),
        'color': meta.get('color', 'border-border'),
        'stages': enriched_stages,
        'sla_summary': get_total_sla_summary(code),
        'read_only': True,
        'source': 'apps.cases.workflow',
    }


def list_all_workflows() -> list[dict]:
    return [
        payload
        for code, _label in CaseFamily.choices
        if (payload := build_workflow_payload(code)) is not None
    ]
