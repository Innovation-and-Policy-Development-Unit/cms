import logging

import requests
from django.conf import settings
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.audit.utils import log_audit

from .compliance import (
    assert_may_use_form_type,
    can_approve_portal_submission,
    requires_manager_approval,
)
from .models import Case, CaseStage, Decision, LitigationRecord, PortalApprovalStatus as PortalStatus
from .serializers import (
    CaseCreateSerializer,
    CaseDetailSerializer,
    CaseListSerializer,
    CaseStageSerializer,
    DecisionSerializer,
    LitigationRecordSerializer,
)

logger = logging.getLogger(__name__)


class CaseViewSet(viewsets.ModelViewSet):
    queryset = Case.objects.select_related('assigned_officer', 'initiating_officer').prefetch_related('stages')
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'case_family', 'is_senior_executive', 'portal_approval_status']
    search_fields = ['reference_number', 'subject_name', 'subject_ministry']
    ordering_fields = ['date_opened', 'date_received', 'reference_number']

    def get_serializer_class(self):
        if self.action == 'create':
            return CaseCreateSerializer
        if self.action in ['retrieve', 'update', 'partial_update']:
            return CaseDetailSerializer
        return CaseListSerializer

    def perform_create(self, serializer):
        case = serializer.save()
        log_audit(self.request.user, 'case_created', 'Case', case.id, f'Case {case.reference_number} created')

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        case = self.get_object()
        case.status = 'closed'
        case.date_closed = timezone.now()
        case.save()
        log_audit(request.user, 'case_closed', 'Case', case.id, f'Case {case.reference_number} closed')
        return Response(CaseDetailSerializer(case, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='close-from-cdp')
    def close_from_cdp(self, request, pk=None):
        """
        Called by SCDMS when the linked submission is fully complete.
        Authentication: X-CDP-Callback-Key (shared CDP_CALLBACK_SECRET).
        """
        expected = getattr(settings, 'CDP_CALLBACK_SECRET', '')
        if not expected or request.headers.get('X-CDP-Callback-Key', '') != expected:
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        case = self.get_object()
        if case.status == 'closed':
            return Response({
                'status': 'already_closed',
                'reference_number': case.reference_number,
            })

        cdp_ref = (request.data.get('cdp_submission_id') or '').strip()
        if case.cdp_submission_id and cdp_ref and case.cdp_submission_id != cdp_ref:
            return Response(
                {'detail': 'cdp_submission_id does not match this case.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        case.status = 'closed'
        case.date_closed = timezone.now()
        case.save(update_fields=['status', 'date_closed'])
        log_audit(
            None,
            'case_closed_cdp',
            'Case',
            case.id,
            f'Case {case.reference_number} closed by SCDMS ({cdp_ref or "—"})',
        )
        return Response({
            'status': 'closed',
            'reference_number': case.reference_number,
            'cdp_submission_id': case.cdp_submission_id,
        })

    @action(detail=True, methods=['post'])
    def reopen(self, request, pk=None):
        case = self.get_object()
        if case.status != 'closed':
            return Response(
                {'detail': 'Only closed cases can be reopened.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        case.status = 'active'
        case.date_closed = None
        case.save()
        log_audit(request.user, 'case_reopened', 'Case', case.id, f'Case {case.reference_number} reopened')
        return Response(CaseDetailSerializer(case, context={'request': request}).data)

    @action(detail=True, methods=['get', 'post'])
    def notes(self, request, pk=None):
        """Internal notes — private to Compliance Unit / Secretary."""
        from .models import CaseNote
        case = self.get_object()
        if request.method == 'POST':
            text = request.data.get('text', '').strip()
            if not text:
                return Response({'detail': 'Note text is required.'}, status=status.HTTP_400_BAD_REQUEST)
            note = CaseNote.objects.create(case=case, author=request.user, text=text)
            from .serializers import CaseNoteSerializer
            return Response(CaseNoteSerializer(note).data, status=status.HTTP_201_CREATED)
        from .serializers import CaseNoteSerializer
        return Response(CaseNoteSerializer(case.case_notes.all(), many=True).data)

    @action(detail=True, methods=['delete'], url_path='notes/(?P<note_id>[0-9]+)')
    def delete_note(self, request, pk=None, note_id=None):
        from .models import CaseNote
        case = self.get_object()
        try:
            note = CaseNote.objects.get(pk=note_id, case=case)
        except CaseNote.DoesNotExist:
            return Response({'detail': 'Note not found.'}, status=status.HTTP_404_NOT_FOUND)
        note.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='submit_response')
    def submit_response(self, request, pk=None):
        """Employee submits their written response to a notice of allegation."""
        case = self.get_object()
        text = request.data.get('response_text', '').strip()
        if not text:
            return Response({'detail': 'response_text is required.'}, status=status.HTTP_400_BAD_REQUEST)
        # Store in the case notes field as a structured marker
        case.notes = (case.notes + f'\n\n[EMPLOYEE RESPONSE — {timezone.now().date()}]\n{text}').strip()
        case.save(update_fields=['notes'])
        log_audit(request.user, 'employee_response', 'Case', case.id,
                  f'Employee response submitted on {case.reference_number}')
        return Response({'detail': 'Response submitted successfully.'})

    @action(detail=True, methods=['get', 'post'], url_path='workflow_summary')
    def workflow_summary(self, request, pk=None):
        """Return statutory SLA summary for this case's workflow family."""
        from .workflow import get_total_sla_summary
        case = self.get_object()
        return Response(get_total_sla_summary(case.case_family))

    @action(detail=True, methods=['get', 'patch'], url_path='stages/(?P<stage_id>[^/.]+)')
    def stage_detail(self, request, pk=None, stage_id=None):
        case = self.get_object()
        stage = CaseStage.objects.get(pk=stage_id, case=case)
        if request.method == 'PATCH':
            serializer = CaseStageSerializer(stage, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            log_audit(request.user, 'stage_updated', 'CaseStage', stage.id,
                      f'Stage "{stage.stage_name}" updated on {case.reference_number}')
            return Response(serializer.data)
        return Response(CaseStageSerializer(stage).data)

    @action(detail=True, methods=['get', 'post'])
    def decisions(self, request, pk=None):
        case = self.get_object()
        if request.method == 'POST':
            serializer = DecisionSerializer(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            serializer.save(case=case)
            log_audit(request.user, 'decision_added', 'Decision', serializer.instance.id,
                      f'Decision added to {case.reference_number}')
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(DecisionSerializer(case.decisions.all(), many=True).data)

    @action(detail=True, methods=['post'], url_path='signoff')
    def signoff(self, request, pk=None):
        """
        Compliance Manager signs off a case and notifies the CDP portal.

        Body (all optional except outcome):
            outcome   – e.g. "cleared" or "referred_back"
            notes     – free-text narrative

        If cdp_callback_url is set on the case, fires a POST to the CDP
        webhook so the submission is moved to Secretary Review automatically.
        """
        case = self.get_object()
        outcome = request.data.get('outcome', '').strip()
        notes   = request.data.get('notes', '').strip()

        if not outcome:
            return Response({'detail': 'outcome is required.'}, status=status.HTTP_400_BAD_REQUEST)

        signoff_by = request.user.get_full_name() or request.user.username

        # Record the decision in the CMS
        decision = Decision.objects.create(
            case=case,
            decided_by_role=getattr(request.user, 'role', 'compliance_unit'),
            decided_by_name=signoff_by,
            outcome=outcome if outcome in [c[0] for c in Decision._meta.get_field('outcome').choices] else 'no_action',
            decided_at=timezone.now().date(),
            narrative=notes,
            created_by=request.user,
        )

        log_audit(
            request.user, 'compliance_signoff', 'Case', case.id,
            f'Compliance sign-off on {case.reference_number} by {signoff_by}: {outcome}',
        )

        # Notify CDP portal if a callback URL is registered
        if case.cdp_callback_url:
            callback_secret = getattr(settings, 'CDP_CALLBACK_SECRET', '')
            payload = {
                'cdp_submission_id': case.cdp_submission_id,
                'outcome':   outcome,
                'signoff_by': signoff_by,
                'notes':     notes,
            }
            try:
                resp = requests.post(
                    case.cdp_callback_url,
                    json=payload,
                    headers={'X-CMS-Callback-Key': callback_secret},
                    timeout=15,
                )
                resp.raise_for_status()
                logger.info(
                    'signoff: CDP callback for %s succeeded (%s)',
                    case.reference_number,
                    case.cdp_submission_id,
                )
            except requests.RequestException as exc:
                logger.error(
                    'signoff: CDP callback for %s failed: %s',
                    case.reference_number,
                    exc,
                )
                return Response(
                    {
                        'detail': 'Sign-off recorded in CMS but CDP notification failed. '
                                  'Please notify the PSC Secretary manually.',
                        'cms_decision_id': decision.id,
                        'cdp_error': str(exc),
                    },
                    status=status.HTTP_207_MULTI_STATUS,
                )

        from .serializers import DecisionSerializer as DS
        return Response(
            {'detail': 'Sign-off recorded.', 'decision': DS(decision).data},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='submit-for-approval')
    def submit_for_approval(self, request, pk=None):
        """Senior / Principal submit a case for Compliance Manager portal approval."""
        case = self.get_object()
        role = getattr(request.user, 'role', '')
        if not requires_manager_approval(role):
            return Response(
                {'detail': 'Only Compliance Senior or Principal may submit for manager approval.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if case.portal_approval_status not in (
            PortalStatus.DRAFT,
            PortalStatus.REJECTED,
        ):
            return Response(
                {'detail': 'Case is not in a state that can be submitted for approval.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not case.portal_form_type_code:
            return Response(
                {'detail': 'Portal submission type (COMP-*) must be set before submitting for approval.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            assert_may_use_form_type(role, case.portal_form_type_code)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        case.portal_approval_status = PortalStatus.PENDING_MANAGER
        case.portal_approval_notes = ''
        case.save(update_fields=['portal_approval_status', 'portal_approval_notes'])
        log_audit(
            request.user, 'portal_submit_approval', 'Case', case.id,
            f'{case.reference_number} submitted for manager portal approval',
        )
        return Response(CaseDetailSerializer(case, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Compliance Manager approves a case for Commission Portal registration."""
        case = self.get_object()
        if not can_approve_portal_submission(request.user):
            return Response({'detail': 'Manager approval required.'}, status=status.HTTP_403_FORBIDDEN)
        if case.portal_approval_status not in (
            PortalStatus.PENDING_MANAGER,
            PortalStatus.DRAFT,
        ):
            return Response(
                {'detail': 'Case is not awaiting manager approval.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        notes = request.data.get('notes', '').strip()
        case.portal_approval_status = PortalStatus.APPROVED
        case.portal_approved_by = request.user
        case.portal_approved_at = timezone.now()
        case.portal_approval_notes = notes
        case.save(update_fields=[
            'portal_approval_status', 'portal_approved_by',
            'portal_approved_at', 'portal_approval_notes',
        ])
        log_audit(
            request.user, 'portal_approved', 'Case', case.id,
            f'{case.reference_number} approved for portal registration',
        )
        return Response(CaseDetailSerializer(case, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Compliance Manager rejects portal registration."""
        case = self.get_object()
        if not can_approve_portal_submission(request.user):
            return Response({'detail': 'Manager approval required.'}, status=status.HTTP_403_FORBIDDEN)
        if case.portal_approval_status != PortalStatus.PENDING_MANAGER:
            return Response(
                {'detail': 'Case is not awaiting manager approval.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        notes = request.data.get('notes', '').strip()
        if not notes:
            return Response({'detail': 'Rejection notes are required.'}, status=status.HTTP_400_BAD_REQUEST)
        case.portal_approval_status = PortalStatus.REJECTED
        case.portal_approval_notes = notes
        case.portal_approved_by = request.user
        case.portal_approved_at = timezone.now()
        case.save(update_fields=[
            'portal_approval_status', 'portal_approval_notes',
            'portal_approved_by', 'portal_approved_at',
        ])
        log_audit(
            request.user, 'portal_rejected', 'Case', case.id,
            f'{case.reference_number} rejected for portal registration',
        )
        return Response(CaseDetailSerializer(case, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='register-with-portal')
    def register_with_portal(self, request, pk=None):
        """
        Create a linked submission in the Commission Decision Portal (CDP).
        Compliance cases are authored in CMS; the portal is for Secretary / Commission tracking.
        """
        case = self.get_object()
        if case.cdp_submission_id:
            return Response(
                {
                    'detail': 'Case is already registered with the portal.',
                    'cdp_submission_id': case.cdp_submission_id,
                },
                status=status.HTTP_200_OK,
            )

        if case.portal_approval_status not in (
            PortalStatus.APPROVED,
            PortalStatus.SENT_TO_PORTAL,
        ):
            return Response(
                {'detail': 'Case must be approved by a Compliance Manager before portal registration.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        form_type_code = (
            request.data.get('form_type_code', '').strip()
            or case.portal_form_type_code
        ).strip()
        if not form_type_code:
            return Response(
                {'detail': 'Portal submission type (COMP-*) is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        role = getattr(request.user, 'role', '')
        try:
            assert_may_use_form_type(role, form_type_code)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        cdp_base = getattr(settings, 'CDP_BASE_URL', '').rstrip('/')
        secret = getattr(settings, 'CDP_CALLBACK_SECRET', '')
        if not cdp_base or not secret:
            return Response(
                {'detail': 'CDP_BASE_URL and CDP_CALLBACK_SECRET must be configured.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        payload = {
            'cms_case_id': str(case.pk),
            'cms_case_reference': case.reference_number,
            'title': (case.description or case.subject_name or case.reference_number).strip(),
            'case_family': case.case_family,
            'form_type_code': form_type_code,
            'subject_ministry': case.subject_ministry,
            'notes': (case.notes or '')[:2000],
            'registered_by': request.user.username,
        }

        try:
            resp = requests.post(
                f'{cdp_base}/api/webhooks/cms-register/',
                json=payload,
                headers={'X-CMS-Callback-Key': secret},
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
        except requests.RequestException as exc:
            logger.error('register_with_portal: CDP request failed for %s: %s', case.reference_number, exc)
            detail = getattr(getattr(exc, 'response', None), 'text', None) or str(exc)
            return Response(
                {'detail': f'Commission Portal registration failed: {detail}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        case.cdp_submission_id = data.get('cdp_submission_id', '')
        case.cdp_submission_ref = (case.description or case.subject_name or '')[:100]
        case.cdp_callback_url = data.get('cdp_callback_url', '')
        case.portal_form_type_code = form_type_code
        case.portal_approval_status = PortalStatus.SENT_TO_PORTAL
        case.portal_sent_at = timezone.now()
        case.save(update_fields=[
            'cdp_submission_id', 'cdp_submission_ref', 'cdp_callback_url',
            'portal_form_type_code', 'portal_approval_status', 'portal_sent_at',
        ])

        log_audit(
            request.user,
            'cdp_registered',
            'Case',
            case.id,
            f'Case {case.reference_number} registered with CDP as {case.cdp_submission_id}',
        )
        return Response(data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get', 'post'])
    def litigation(self, request, pk=None):
        case = self.get_object()
        if request.method == 'POST':
            serializer = LitigationRecordSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(case=case)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(LitigationRecordSerializer(case.litigation_records.all(), many=True).data)


class DashboardStatsView(viewsets.ViewSet):
    def list(self, request):
        from django.db.models import Count, Q
        total = Case.objects.count()
        active = Case.objects.filter(status='active').count()
        closed = Case.objects.filter(status='closed').count()
        overdue = CaseStage.objects.filter(
            status='in_progress', sla_status='overdue'
        ).values('case').distinct().count()
        by_family = Case.objects.values('case_family').annotate(count=Count('id'))
        return Response({
            'total_cases': total,
            'active_cases': active,
            'closed_cases': closed,
            'overdue_cases': overdue,
            'cases_by_family': list(by_family),
        })
