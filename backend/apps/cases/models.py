from django.db import models
from django.utils import timezone
from apps.accounts.models import User


class CaseFamily(models.TextChoices):
    EMPLOYEE_DISCIPLINARY = 'employee_disciplinary', 'Employee Internal Disciplinary'
    SERIOUS_MISCONDUCT_EMPLOYEE = 'serious_misconduct_employee', 'Serious Misconduct — Employee'
    TEMPORARY_SUSPENSION = 'temporary_suspension', 'Temporary Suspension'
    GRIEVANCE = 'grievance', 'Grievance Process'
    SENIOR_SERIOUS_MISCONDUCT = 'senior_serious_misconduct', 'Senior Executive — Serious Misconduct'
    SENIOR_POOR_PERFORMANCE = 'senior_poor_performance', 'Senior Executive — Poor Performance'


class CaseStatus(models.TextChoices):
    ACTIVE = 'active', 'Active'
    ON_HOLD = 'on_hold', 'On Hold'
    CLOSED = 'closed', 'Closed'
    ARCHIVED = 'archived', 'Archived'


class SLAStatus(models.TextChoices):
    ON_TRACK = 'on_track', 'On Track'
    AT_RISK = 'at_risk', 'At Risk'
    OVERDUE = 'overdue', 'Overdue'
    COMPLETED = 'completed', 'Completed'


class StageStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    IN_PROGRESS = 'in_progress', 'In Progress'
    COMPLETED = 'completed', 'Completed'
    SKIPPED = 'skipped', 'Skipped'


class DecisionOutcome(models.TextChoices):
    REINSTATE = 'reinstate', 'Reinstated'
    TERMINATE = 'terminate', 'Terminated / Dismissed'
    WARN = 'warn', 'Formal Warning Issued'
    DEMOTE = 'demote', 'Demotion'
    SUSPEND_NO_PAY = 'suspend_no_pay', 'Suspension Without Pay'
    COMPULSORY_RETIRE = 'compulsory_retire', 'Compulsory Retirement'
    NO_ACTION = 'no_action', 'No Further Action'
    REFERRED_PSDB = 'referred_psdb', 'Referred to PSDB'
    SETTLED = 'settled', 'Settled (Grievance)'
    NOT_SETTLED = 'not_settled', 'Not Settled (Grievance)'


class PortalApprovalStatus(models.TextChoices):
    DRAFT = 'draft', 'Draft'
    PENDING_MANAGER = 'pending_manager', 'Pending Manager Approval'
    APPROVED = 'approved', 'Approved for Portal'
    REJECTED = 'rejected', 'Rejected'
    SENT_TO_PORTAL = 'sent_to_portal', 'Sent to Commission Portal'


class Case(models.Model):
    reference_number = models.CharField(max_length=30, unique=True, editable=False)
    case_family = models.CharField(max_length=40, choices=CaseFamily.choices)
    status = models.CharField(max_length=20, choices=CaseStatus.choices, default=CaseStatus.ACTIVE)

    portal_form_type_code = models.CharField(
        max_length=32, blank=True, default='',
        help_text='SCDMS COMP-* form type when registered with the Commission Portal.',
    )
    portal_approval_status = models.CharField(
        max_length=24,
        choices=PortalApprovalStatus.choices,
        default=PortalApprovalStatus.DRAFT,
    )
    initiator_compliance_role = models.CharField(max_length=32, blank=True, default='')
    portal_approved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='portal_approved_cases',
    )
    portal_approved_at = models.DateTimeField(null=True, blank=True)
    portal_approval_notes = models.TextField(blank=True)
    portal_sent_at = models.DateTimeField(null=True, blank=True)

    subject_name = models.CharField(max_length=200)
    subject_position = models.CharField(max_length=200, blank=True)
    subject_ministry = models.CharField(max_length=200, blank=True)
    is_senior_executive = models.BooleanField(default=False)

    initiating_officer = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='initiated_cases'
    )
    assigned_officer = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_cases'
    )

    date_received = models.DateField()
    date_opened = models.DateTimeField(auto_now_add=True)
    date_closed = models.DateTimeField(null=True, blank=True)

    description = models.TextField(blank=True)
    notes = models.TextField(blank=True)

    # ── CDP integration ────────────────────────────────────────────────────
    cdp_submission_id  = models.CharField(max_length=50, blank=True, default="", db_index=True,
        help_text="CDP reference number, e.g. PSC-2026-00001. Set when the case originates from the portal.")
    cdp_submission_ref = models.CharField(max_length=100, blank=True, default="",
        help_text="Human-readable CDP title / label (denormalised for display).")
    cdp_callback_url   = models.URLField(max_length=500, blank=True, default="",
        help_text="SCDMS callback URL (reserved; CMS does not drive Secretary review after sync).")

    class Meta:
        ordering = ['-date_opened']

    def save(self, *args, **kwargs):
        if not self.reference_number:
            self.reference_number = self._generate_reference()
        super().save(*args, **kwargs)

    def _generate_reference(self):
        prefix_map = {
            CaseFamily.EMPLOYEE_DISCIPLINARY: 'ED',
            CaseFamily.SERIOUS_MISCONDUCT_EMPLOYEE: 'SM',
            CaseFamily.TEMPORARY_SUSPENSION: 'TS',
            CaseFamily.GRIEVANCE: 'GR',
            CaseFamily.SENIOR_SERIOUS_MISCONDUCT: 'SS',
            CaseFamily.SENIOR_POOR_PERFORMANCE: 'SP',
        }
        year = timezone.now().year
        prefix = prefix_map.get(self.case_family, 'CC')
        count = Case.objects.filter(case_family=self.case_family, date_opened__year=year).count() + 1
        return f'CCMS-{prefix}-{year}-{count:04d}'

    def __str__(self):
        return f'{self.reference_number} – {self.subject_name}'

    @property
    def overall_sla_status(self):
        active_stages = self.stages.filter(status=StageStatus.IN_PROGRESS)
        if active_stages.filter(sla_status=SLAStatus.OVERDUE).exists():
            return SLAStatus.OVERDUE
        if active_stages.filter(sla_status=SLAStatus.AT_RISK).exists():
            return SLAStatus.AT_RISK
        return SLAStatus.ON_TRACK


class CaseStage(models.Model):
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='stages')
    stage_name = models.CharField(max_length=150)
    stage_order = models.PositiveSmallIntegerField()
    # Short machine-stable identifier copied from workflow definition
    stage_code = models.CharField(max_length=60, blank=True)
    assigned_officer = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='stage_assignments'
    )
    status = models.CharField(max_length=20, choices=StageStatus.choices, default=StageStatus.PENDING)
    sla_status = models.CharField(max_length=20, choices=SLAStatus.choices, default=SLAStatus.ON_TRACK)
    due_date = models.DateField(null=True, blank=True)
    # Number of days in the statutory SLA
    sla_days = models.PositiveSmallIntegerField(null=True, blank=True)
    # True = sla_days are working days (Mon–Fri); False = calendar days
    sla_working_days = models.BooleanField(default=True)
    # Whether this stage can be skipped when the trigger is absent
    is_optional = models.BooleanField(default=False)
    # Abbreviated statutory citation  e.g. "PSC Reg. 28(1)"
    statutory_ref = models.CharField(max_length=100, blank=True)
    # Role primarily responsible for driving this stage
    responsible_role = models.CharField(max_length=40, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['stage_order']
        unique_together = ['case', 'stage_order']

    def save(self, *args, **kwargs):
        if self.due_date:
            days_left = (self.due_date - timezone.now().date()).days
            if self.status == StageStatus.COMPLETED:
                self.sla_status = SLAStatus.COMPLETED
            elif days_left < 0:
                self.sla_status = SLAStatus.OVERDUE
            elif days_left <= 3:
                self.sla_status = SLAStatus.AT_RISK
            else:
                self.sla_status = SLAStatus.ON_TRACK
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.case.reference_number} | Stage {self.stage_order}: {self.stage_name}'


class Decision(models.Model):
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='decisions')
    decided_by_role = models.CharField(max_length=50)
    decided_by_name = models.CharField(max_length=200)
    outcome = models.CharField(max_length=30, choices=DecisionOutcome.choices)
    decided_at = models.DateField()
    narrative = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='recorded_decisions'
    )

    class Meta:
        ordering = ['-decided_at']


class CaseNote(models.Model):
    """Private internal notes — visible to Compliance Unit / Secretary only."""
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='case_notes')
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='case_notes')
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Note on {self.case.reference_number} by {self.author}'


class LitigationRecord(models.Model):
    class LitigationStatus(models.TextChoices):
        ACTIVE = 'active', 'Active'
        SETTLED = 'settled', 'Settled'
        DISMISSED = 'dismissed', 'Dismissed'
        JUDGMENT = 'judgment', 'Judgment Issued'

    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='litigation_records')
    description = models.TextField()
    legal_counsel = models.CharField(max_length=200, blank=True)
    court_reference = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=LitigationStatus.choices, default=LitigationStatus.ACTIVE)
    estimated_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    actual_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    date_initiated = models.DateField()
    date_resolved = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
