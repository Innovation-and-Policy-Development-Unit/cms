import logging

from django.conf import settings
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.models import User
from apps.audit.utils import log_audit
from apps.notifications.models import Notification
from apps.notifications.utils import notify_user

from .filters import CaseFilter
from .scoping import cases_visible_to_user
from .compliance import (
    assert_may_use_form_type,
    can_approve_portal_submission,
    requires_manager_approval,
)
from .portal_integration import (
    apply_scdms_registration_response,
    build_scdms_export_payload,
    case_may_sync_to_scdms,
    sync_case_to_scdms,
    verify_scdms_integration_key,
)
from .scdms_serializers import ScdmsCaseExportSerializer
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
    filterset_class = CaseFilter
    search_fields = ['reference_number', 'subject_name', 'subject_ministry']
    ordering_fields = ['date_opened', 'date_received', 'reference_number']

    def get_queryset(self):
        base = super().get_queryset()
        return cases_visible_to_user(self.request.user, base)

    def get_serializer_class(self):
        if self.action == 'create':
            return CaseCreateSerializer
        if self.action in ['retrieve', 'update', 'partial_update']:
            return CaseDetailSerializer
        return CaseListSerializer

    def perform_create(self, serializer):
        case = serializer.save()
        log_audit(self.request.user, 'case_created', 'Case', case.id, f'Case {case.reference_number} created')
        if case.portal_approval_status == PortalStatus.APPROVED and case.portal_form_type_code:
            sync_case_to_scdms(case, self.request.user)

    def _response_with_portal_sync(self, case, request, *, portal_sync: dict | None = None):
        data = CaseDetailSerializer(case, context={'request': request}).data
        if portal_sync is not None:
            data['portal_sync'] = portal_sync
        return Response(data)

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
        Record a CMS-only compliance decision before SCDMS sync.

        Deprecated for cases linked to SCDMS: Secretary and Commission work
        (steps 4–5) must stay in SCDMS after portal registration.
        """
        case = self.get_object()
        if case.cdp_submission_id or case.portal_approval_status == PortalStatus.SENT_TO_PORTAL:
            return Response(
                {
                    'detail': (
                        'This case is linked to SCDMS. Secretary and Commission actions '
                        'must be recorded in SCDMS, not via CMS sign-off.'
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        outcome = request.data.get('outcome', '').strip()
        notes = request.data.get('notes', '').strip()
        if not outcome:
            return Response({'detail': 'outcome is required.'}, status=status.HTTP_400_BAD_REQUEST)

        signoff_by = request.user.get_full_name() or request.user.username
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
        from .serializers import DecisionSerializer as DS
        return Response(
            {'detail': 'Sign-off recorded in CMS (pre-SCDMS only).', 'decision': DS(decision).data},
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
        for manager in User.objects.filter(
            role__in=[
                User.Role.COMPLIANCE_MANAGER,
                User.Role.ADMIN,
                User.Role.SUPERADMIN,
            ],
            is_active=True,
        ):
            notify_user(
                manager,
                title='Approval required',
                message=f'{case.reference_number} is pending manager portal approval.',
                notif_type=Notification.NotifType.GENERAL,
                related_case_id=case.id,
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
        portal_sync = sync_case_to_scdms(case, request.user)
        if portal_sync.get('status') == 'synced':
            log_audit(
                request.user, 'cdp_registered', 'Case', case.id,
                f'{case.reference_number} synced to SCDMS as {case.cdp_submission_id}',
            )
        initiator = case.initiating_officer
        if initiator and initiator != request.user:
            sync_note = (
                ' and synced to SCDMS.'
                if portal_sync.get('status') == 'synced'
                else '.'
            )
            notify_user(
                initiator,
                title=f'Portal approved: {case.reference_number}',
                message=f'Your submission was approved by {request.user.get_full_name() or request.user.username}{sync_note}',
                notif_type=Notification.NotifType.GENERAL,
                related_case_id=case.id,
            )
        return self._response_with_portal_sync(case, request, portal_sync=portal_sync)

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
        initiator = case.initiating_officer
        if initiator and initiator != request.user:
            notify_user(
                initiator,
                title=f'Portal rejected: {case.reference_number}',
                message=f'Your submission was rejected. Notes: {notes}',
                notif_type=Notification.NotifType.GENERAL,
                related_case_id=case.id,
            )
        return Response(CaseDetailSerializer(case, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='register-with-portal')
    def register_with_portal(self, request, pk=None):
        """
        Push sync to SCDMS (retry after manager approval if auto-sync failed).
        """
        case = self.get_object()
        if case.cdp_submission_id:
            return Response(
                {
                    'detail': 'Case is already registered with SCDMS.',
                    'cdp_submission_id': case.cdp_submission_id,
                },
                status=status.HTTP_200_OK,
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

        block = case_may_sync_to_scdms(case)
        if block and not case.cdp_submission_id:
            return Response({'detail': block}, status=status.HTTP_400_BAD_REQUEST)

        portal_sync = sync_case_to_scdms(
            case, request.user, form_type_code=form_type_code, push=True,
        )
        if portal_sync.get('status') == 'synced':
            log_audit(
                request.user, 'cdp_registered', 'Case', case.id,
                f'Case {case.reference_number} registered with SCDMS as {case.cdp_submission_id}',
            )
            return Response(
                {
                    'cdp_submission_id': case.cdp_submission_id,
                    'cdp_callback_url': case.cdp_callback_url,
                    'portal_sync': portal_sync,
                },
                status=status.HTTP_201_CREATED,
            )
        if portal_sync.get('status') == 'failed':
            return Response(
                {'detail': portal_sync.get('detail', 'SCDMS registration failed.'), 'portal_sync': portal_sync},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response({'portal_sync': portal_sync}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='scdms-queue')
    def scdms_queue(self, request):
        """
        SCDMS pull: list manager-approved cases ready for ingestion.

        Auth: X-CDP-Callback-Key or X-SCDMS-API-Key (= CDP_CALLBACK_SECRET).
        Query: pending_only=true (default) — approved, active, not yet in SCDMS.
        """
        if not verify_scdms_integration_key(request):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        pending_only = request.query_params.get('pending_only', 'true').lower() != 'false'
        qs = Case.objects.filter(
            status='active',
            portal_approval_status=PortalStatus.APPROVED,
        ).exclude(portal_form_type_code='').select_related(
            'portal_approved_by', 'initiating_officer',
        ).order_by('portal_approved_at', 'date_opened')

        if pending_only:
            qs = qs.filter(cdp_submission_id='')

        page = self.paginate_queryset(qs)
        serializer = ScdmsCaseExportSerializer(page if page is not None else qs, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='scdms-export')
    def scdms_export(self, request, pk=None):
        """SCDMS pull: full export payload for one approved case."""
        if not verify_scdms_integration_key(request):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        case = self.get_object()
        if case.portal_approval_status not in (
            PortalStatus.APPROVED,
            PortalStatus.SENT_TO_PORTAL,
        ):
            return Response(
                {'detail': 'Case is not approved for SCDMS.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(build_scdms_export_payload(case))

    @action(detail=True, methods=['post'], url_path='scdms-ack')
    def scdms_ack(self, request, pk=None):
        """
        SCDMS pull: acknowledge ingestion after SCDMS created the submission locally.

        Body: cdp_submission_id (required), optional cdp_callback_url, cdp_submission_ref.
        """
        if not verify_scdms_integration_key(request):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        case = self.get_object()
        if case.portal_approval_status not in (
            PortalStatus.APPROVED,
            PortalStatus.SENT_TO_PORTAL,
        ):
            return Response(
                {'detail': 'Case is not approved for SCDMS.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cdp_id = (request.data.get('cdp_submission_id') or '').strip()
        if not cdp_id:
            return Response(
                {'detail': 'cdp_submission_id is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = {
            'cdp_submission_id': cdp_id,
            'cdp_callback_url': (request.data.get('cdp_callback_url') or '').strip(),
            'cdp_submission_ref': (request.data.get('cdp_submission_ref') or '').strip(),
        }
        apply_scdms_registration_response(case, data)
        log_audit(
            None,
            'cdp_registered',
            'Case',
            case.id,
            f'{case.reference_number} acknowledged by SCDMS pull as {cdp_id}',
        )
        return Response({
            'status': 'acknowledged',
            'reference_number': case.reference_number,
            'cdp_submission_id': case.cdp_submission_id,
        })

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
        visible_cases = cases_visible_to_user(request.user, Case.objects.all())
        visible_case_ids = visible_cases.values('pk')
        total = visible_cases.count()
        active = visible_cases.filter(status='active').count()
        closed = visible_cases.filter(status='closed').count()
        overdue = CaseStage.objects.filter(
            case_id__in=visible_case_ids,
            status='in_progress',
            sla_status='overdue',
        ).values('case').distinct().count()
        by_family = visible_cases.values('case_family').annotate(count=Count('id'))
        return Response({
            'total_cases': total,
            'active_cases': active,
            'closed_cases': closed,
            'overdue_cases': overdue,
            'cases_by_family': list(by_family),
        })
