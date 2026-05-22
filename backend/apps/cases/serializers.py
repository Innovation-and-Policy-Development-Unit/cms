from rest_framework import serializers
from django.utils import timezone
from .models import Case, CaseStage, CaseNote, Decision, LitigationRecord, PortalApprovalStatus
from .workflow import get_stages_for_family, compute_due_date
from .compliance import (
    assert_may_use_form_type,
    initial_approval_status_for_role,
    is_compliance_role,
)
from apps.accounts.serializers import UserSerializer


class CaseStageSerializer(serializers.ModelSerializer):
    assigned_officer_detail = UserSerializer(source='assigned_officer', read_only=True)
    days_until_due = serializers.SerializerMethodField()

    class Meta:
        model = CaseStage
        fields = [
            'id', 'stage_name', 'stage_order', 'stage_code',
            'status', 'sla_status',
            'sla_days', 'sla_working_days', 'is_optional',
            'statutory_ref', 'responsible_role',
            'due_date', 'started_at', 'completed_at', 'notes',
            'assigned_officer', 'assigned_officer_detail', 'days_until_due',
        ]

    def get_days_until_due(self, obj):
        if obj.due_date:
            return (obj.due_date - timezone.now().date()).days
        return None


class CaseNoteSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = CaseNote
        fields = ['id', 'text', 'author', 'author_name', 'created_at', 'updated_at']
        read_only_fields = ['author', 'created_at', 'updated_at']

    def get_author_name(self, obj):
        return obj.author.get_full_name() if obj.author else 'Unknown'


class DecisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Decision
        fields = [
            'id', 'decided_by_role', 'decided_by_name', 'outcome',
            'decided_at', 'narrative', 'created_at', 'created_by',
        ]
        read_only_fields = ['created_at', 'created_by']

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class LitigationRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = LitigationRecord
        fields = '__all__'
        read_only_fields = ['case', 'created_at']


class CaseListSerializer(serializers.ModelSerializer):
    assigned_officer_name = serializers.SerializerMethodField()
    overall_sla_status = serializers.CharField(read_only=True)
    active_stage = serializers.SerializerMethodField()

    class Meta:
        model = Case
        fields = [
            'id', 'reference_number', 'case_family', 'status',
            'subject_name', 'subject_ministry', 'is_senior_executive',
            'assigned_officer_name', 'date_received', 'date_opened',
            'overall_sla_status', 'active_stage',
            'portal_form_type_code', 'portal_approval_status', 'cdp_submission_id',
        ]

    def get_assigned_officer_name(self, obj):
        return obj.assigned_officer.get_full_name() if obj.assigned_officer else None

    def get_active_stage(self, obj):
        stage = obj.stages.filter(status='in_progress').first()
        if stage:
            return {
                'name': stage.stage_name,
                'due_date': stage.due_date,
                'sla_working_days': stage.sla_working_days,
                'is_optional': stage.is_optional,
            }
        return None


class CaseDetailSerializer(serializers.ModelSerializer):
    stages = CaseStageSerializer(many=True, read_only=True)
    decisions = DecisionSerializer(many=True, read_only=True)
    litigation_records = LitigationRecordSerializer(many=True, read_only=True)
    initiating_officer_detail = UserSerializer(source='initiating_officer', read_only=True)
    assigned_officer_detail = UserSerializer(source='assigned_officer', read_only=True)
    portal_approved_by_detail = UserSerializer(source='portal_approved_by', read_only=True)
    overall_sla_status = serializers.CharField(read_only=True)

    class Meta:
        model = Case
        fields = [
            'id', 'reference_number', 'case_family', 'status',
            'subject_name', 'subject_position', 'subject_ministry', 'is_senior_executive',
            'initiating_officer', 'initiating_officer_detail',
            'assigned_officer', 'assigned_officer_detail',
            'date_received', 'date_opened', 'date_closed',
            'description', 'notes', 'overall_sla_status',
            'stages', 'decisions', 'litigation_records',
            'cdp_submission_id', 'cdp_submission_ref', 'cdp_callback_url',
            'portal_form_type_code', 'portal_approval_status',
            'initiator_compliance_role', 'portal_approved_by', 'portal_approved_by_detail',
            'portal_approved_at', 'portal_approval_notes', 'portal_sent_at',
        ]
        read_only_fields = [
            'reference_number', 'date_opened',
            'portal_approval_status', 'initiator_compliance_role',
            'portal_approved_by', 'portal_approved_at', 'portal_sent_at',
        ]


class CaseCreateSerializer(serializers.ModelSerializer):
    portal_form_type_code = serializers.CharField(
        max_length=32, required=False, allow_blank=True, default='',
    )

    class Meta:
        model = Case
        fields = [
            'case_family', 'subject_name', 'subject_position', 'subject_ministry',
            'is_senior_executive', 'assigned_officer', 'date_received', 'description',
            'portal_form_type_code',
            # CDP integration fields (optional — only set when case originates from portal)
            'cdp_submission_id', 'cdp_submission_ref', 'cdp_callback_url',
        ]
        extra_kwargs = {
            'cdp_submission_id':  {'required': False},
            'cdp_submission_ref': {'required': False},
            'cdp_callback_url':   {'required': False},
            'subject_name':       {'required': False, 'default': ''},
        }

    def validate(self, attrs):
        request = self.context.get('request')
        role = getattr(request.user, 'role', '') if request and request.user.is_authenticated else ''
        form_code = (attrs.get('portal_form_type_code') or '').strip()
        if is_compliance_role(role):
            if not form_code:
                raise serializers.ValidationError(
                    {'portal_form_type_code': 'Portal submission type (COMP-*) is required.'}
                )
            try:
                assert_may_use_form_type(role, form_code)
            except ValueError as exc:
                raise serializers.ValidationError({'portal_form_type_code': str(exc)}) from exc
        elif form_code:
            try:
                assert_may_use_form_type(role, form_code)
            except ValueError as exc:
                raise serializers.ValidationError({'portal_form_type_code': str(exc)}) from exc
        return attrs

    def create(self, validated_data):
        request = self.context['request']
        user = request.user if request.user.is_authenticated else None
        role = getattr(user, 'role', '') if user else ''
        form_code = (validated_data.get('portal_form_type_code') or '').strip()
        validated_data['portal_form_type_code'] = form_code

        if user and 'initiating_officer' not in validated_data:
            validated_data['initiating_officer'] = user
        if is_compliance_role(role):
            validated_data['initiator_compliance_role'] = role
            validated_data['portal_approval_status'] = initial_approval_status_for_role(role)
        elif form_code:
            validated_data['portal_approval_status'] = PortalApprovalStatus.DRAFT

        case = super().create(validated_data)
        self._create_workflow_stages(case)
        return case

    def _create_workflow_stages(self, case):
        """
        Create CaseStage records from the statutory workflow definition.

        Due dates are computed correctly:
        - Working-day SLAs skip Saturday & Sunday.
        - Calendar-day SLAs (e.g. 45-day confirmation) add straight days.
        - Each stage's due date runs from the *case registration date*, not
          cumulatively from the previous stage, so each deadline is
          independently trackable.  (Compliance officers can adjust
        individual due dates later via PATCH /stages/{id}.)
        """
        today = case.date_received  # anchor to date received, not server date

        for stage_def in get_stages_for_family(case.case_family):
            due = compute_due_date(today, stage_def['sla_days'], stage_def['is_working_days'])
            CaseStage.objects.create(
                case=case,
                stage_name=stage_def['name'],
                stage_order=stage_def['order'],
                stage_code=stage_def.get('stage_code', ''),
                sla_days=stage_def['sla_days'],
                sla_working_days=stage_def['is_working_days'],
                is_optional=stage_def.get('is_optional', False),
                statutory_ref=stage_def.get('statutory_ref', ''),
                responsible_role=stage_def.get('responsible_role', ''),
                due_date=due,
                status='in_progress' if stage_def['order'] == 1 else 'pending',
            )
