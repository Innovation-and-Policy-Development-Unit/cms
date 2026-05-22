"""
CMS ↔ SCDMS portal sync (push webhook + export payload for SCDMS pull).

Operating model: docs/CMS-SCDMS-operating-model.md
"""

from __future__ import annotations

import logging
from typing import Any

import requests
from django.conf import settings

from .compliance import PortalApprovalStatus as PortalStatus
from .models import Case

logger = logging.getLogger(__name__)

SCDMS_API_KEY_HEADERS = ('X-CDP-Callback-Key', 'X-SCDMS-API-Key')


def verify_scdms_integration_key(request) -> bool:
    """True when request carries the shared CMS↔SCDMS integration secret."""
    expected = (getattr(settings, 'CDP_CALLBACK_SECRET', '') or '').strip()
    if not expected:
        return False
    for header in SCDMS_API_KEY_HEADERS:
        if request.headers.get(header, '') == expected:
            return True
    return False


def integration_configured() -> bool:
    base = (getattr(settings, 'CDP_BASE_URL', '') or '').strip()
    secret = (getattr(settings, 'CDP_CALLBACK_SECRET', '') or '').strip()
    return bool(base and secret)


def case_may_sync_to_scdms(case: Case) -> str | None:
    """Return None if sync is allowed, else a human-readable reason."""
    if case.cdp_submission_id:
        return 'Case is already registered with SCDMS.'
    if case.status != 'active':
        return 'Only active cases can be synced to SCDMS.'
    if case.portal_approval_status not in (
        PortalStatus.APPROVED,
        PortalStatus.SENT_TO_PORTAL,
    ):
        return 'Case must be approved by a Compliance Manager before SCDMS sync.'
    if not (case.portal_form_type_code or '').strip():
        return 'Portal submission type (COMP-*) is required.'
    return None


def build_scdms_register_payload(case: Case, *, registered_by: str) -> dict[str, Any]:
    form_type_code = (case.portal_form_type_code or '').strip()
    return {
        'cms_case_id': str(case.pk),
        'cms_case_reference': case.reference_number,
        'title': (case.description or case.subject_name or case.reference_number).strip(),
        'case_family': case.case_family,
        'form_type_code': form_type_code,
        'subject_name': case.subject_name,
        'subject_position': case.subject_position,
        'subject_ministry': case.subject_ministry,
        'is_senior_executive': case.is_senior_executive,
        'notes': (case.notes or '')[:2000],
        'description': (case.description or '')[:2000],
        'registered_by': registered_by,
        'portal_approved_at': (
            case.portal_approved_at.isoformat() if case.portal_approved_at else None
        ),
        'initiator_compliance_role': case.initiator_compliance_role or '',
    }


def build_scdms_export_payload(case: Case) -> dict[str, Any]:
    """Payload for SCDMS pull (GET queue / export)."""
    approved_by = ''
    if case.portal_approved_by_id:
        approved_by = case.portal_approved_by.get_full_name() or case.portal_approved_by.username

    payload = build_scdms_register_payload(
        case,
        registered_by=approved_by or (case.initiating_officer.username if case.initiating_officer else ''),
    )
    payload.update({
        'portal_approval_status': case.portal_approval_status,
        'portal_approval_notes': case.portal_approval_notes or '',
        'portal_approved_by': approved_by,
        'cdp_submission_id': case.cdp_submission_id or None,
        'portal_sent_at': case.portal_sent_at.isoformat() if case.portal_sent_at else None,
        'date_received': case.date_received.isoformat() if case.date_received else None,
        'date_opened': case.date_opened.isoformat() if case.date_opened else None,
        'status': case.status,
    })
    return payload


def apply_scdms_registration_response(case: Case, data: dict[str, Any], *, form_type_code: str | None = None) -> None:
    from django.utils import timezone

    case.cdp_submission_id = (data.get('cdp_submission_id') or '').strip()
    case.cdp_submission_ref = (
        (data.get('cdp_submission_ref') or case.description or case.subject_name or '')[:100]
    )
    case.cdp_callback_url = (data.get('cdp_callback_url') or '').strip()
    if form_type_code:
        case.portal_form_type_code = form_type_code
    case.portal_approval_status = PortalStatus.SENT_TO_PORTAL
    case.portal_sent_at = timezone.now()
    case.save(update_fields=[
        'cdp_submission_id', 'cdp_submission_ref', 'cdp_callback_url',
        'portal_form_type_code', 'portal_approval_status', 'portal_sent_at',
    ])


def push_case_to_scdms(case: Case, *, registered_by: str, form_type_code: str | None = None) -> dict[str, Any]:
    """
    POST to SCDMS cms-register webhook. Returns parsed JSON on success.

    Raises requests.RequestException on transport/HTTP errors.
    """
    cdp_base = getattr(settings, 'CDP_BASE_URL', '').rstrip('/')
    secret = getattr(settings, 'CDP_CALLBACK_SECRET', '')
    form_code = (form_type_code or case.portal_form_type_code or '').strip()
    payload = build_scdms_register_payload(case, registered_by=registered_by)
    payload['form_type_code'] = form_code

    resp = requests.post(
        f'{cdp_base}/api/webhooks/cms-register/',
        json=payload,
        headers={'X-CMS-Callback-Key': secret},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def sync_case_to_scdms(
    case: Case,
    user,
    *,
    form_type_code: str | None = None,
    push: bool = True,
) -> dict[str, Any]:
    """
    Sync an approved case to SCDMS (push webhook when configured).

    Returns a status dict for API responses:
      status: synced | already_synced | skipped | failed
    """
    block = case_may_sync_to_scdms(case)
    if block:
        if case.cdp_submission_id:
            return {'status': 'already_synced', 'cdp_submission_id': case.cdp_submission_id}
        return {'status': 'skipped', 'reason': block}

    if not push or not integration_configured():
        return {
            'status': 'skipped',
            'reason': (
                'SCDMS push not configured (set CDP_BASE_URL and CDP_CALLBACK_SECRET). '
                'SCDMS may pull this case via GET /api/v1/cases/scdms-queue/.'
            ),
        }

    registered_by = getattr(user, 'username', None) or 'system'
    form_code = (form_type_code or case.portal_form_type_code or '').strip()

    try:
        data = push_case_to_scdms(case, registered_by=registered_by, form_type_code=form_code)
    except requests.RequestException as exc:
        logger.error('sync_case_to_scdms: failed for %s: %s', case.reference_number, exc)
        detail = getattr(getattr(exc, 'response', None), 'text', None) or str(exc)
        return {'status': 'failed', 'detail': detail}

    apply_scdms_registration_response(case, data, form_type_code=form_code)
    return {
        'status': 'synced',
        'cdp_submission_id': case.cdp_submission_id,
        'cdp_callback_url': case.cdp_callback_url,
    }
