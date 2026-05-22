"""
Statutory Workflow Definitions — CCMS / OPSC Vanuatu
=====================================================
Each stage carries:
  order           – sequence within the family (1-based)
  name            – human-readable stage label
  stage_code      – short machine identifier (stable across renames)
  sla_days        – numeric deadline
  is_working_days – True = working days (Mon–Fri), False = calendar days
  responsible_role– role primarily responsible for driving the stage
  statutory_ref   – abbreviated legal/regulatory citation
  is_optional     – stage may be skipped if the trigger condition is absent
  description     – one-line plain-English explanation of what happens

Working-day SLA conversion
--------------------------
Use `working_days_due_date(start, n)` to compute a due date that skips
weekends.  Public holidays are NOT yet integrated — a later enhancement
can add a PublicHoliday model and filter those dates out too.
"""

from datetime import date, timedelta


# ── Utility ───────────────────────────────────────────────────────────────────

def working_days_due_date(start: date, n: int) -> date:
    """Return the date that is *n* working days (Mon–Fri) after *start*."""
    if n <= 0:
        return start
    current = start
    days_added = 0
    while days_added < n:
        current += timedelta(days=1)
        if current.weekday() < 5:   # 0=Mon … 4=Fri
            days_added += 1
    return current


def calendar_days_due_date(start: date, n: int) -> date:
    return start + timedelta(days=n)


def compute_due_date(start: date, sla_days: int, is_working_days: bool) -> date:
    if is_working_days:
        return working_days_due_date(start, sla_days)
    return calendar_days_due_date(start, sla_days)


# ── Helpers for stage dicts ───────────────────────────────────────────────────

def _s(order, name, code, sla_days, is_working_days, responsible_role,
       statutory_ref, description, is_optional=False):
    return {
        'order':            order,
        'name':             name,
        'stage_code':       code,
        'sla_days':         sla_days,
        'is_working_days':  is_working_days,
        'responsible_role': responsible_role,
        'statutory_ref':    statutory_ref,
        'description':      description,
        'is_optional':      is_optional,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 1. EMPLOYEE INTERNAL DISCIPLINARY  (PSC Reg. 27 – 32)
# ─────────────────────────────────────────────────────────────────────────────
_EMPLOYEE_DISCIPLINARY = [
    _s(1,  'Notice of Allegation Served',
       'allegation_notice',
       sla_days=5, is_working_days=True,
       responsible_role='compliance_unit',
       statutory_ref='PSC Reg. 28(1)',
       description='Written notice of allegation served on the subject employee within 5 working days of case registration.'),

    _s(2,  'Subject Response Period',
       'subject_response',
       sla_days=5, is_working_days=True,
       responsible_role='employee_subject',
       statutory_ref='PSC Reg. 28(2)',
       description='Subject has 5 working days to lodge a written response to the allegation notice.'),

    _s(3,  'Investigation Committee Appointed',
       'committee_appointed',
       sla_days=5, is_working_days=True,
       responsible_role='compliance_unit',
       statutory_ref='PSC Reg. 29(1)',
       description='An Investigation Committee of three members is constituted within 5 working days of the response deadline.'),

    _s(4,  'Investigation Conducted',
       'investigation',
       sla_days=21, is_working_days=True,
       responsible_role='compliance_unit',
       statutory_ref='PSC Reg. 29(2)',
       description='Committee conducts its investigation and interviews within 21 working days of appointment.'),

    _s(5,  'Investigation Report Submitted',
       'investigation_report',
       sla_days=5, is_working_days=True,
       responsible_role='compliance_unit',
       statutory_ref='PSC Reg. 30(1)',
       description='Committee submits a written report with findings and recommendations within 5 working days of completing the investigation.'),

    _s(6,  'Head of Department / PSC Decision',
       'hod_decision',
       sla_days=10, is_working_days=True,
       responsible_role='secretary_opsc',
       statutory_ref='PSC Reg. 31(1)',
       description='Appointing authority reviews the report and makes a disciplinary decision within 10 working days.'),

    _s(7,  'Outcome Letter Issued to Subject',
       'outcome_letter',
       sla_days=3, is_working_days=True,
       responsible_role='compliance_unit',
       statutory_ref='PSC Reg. 32(1)',
       description='Written outcome letter issued to the subject within 3 working days of the decision.'),
]


# ─────────────────────────────────────────────────────────────────────────────
# 2. SERIOUS MISCONDUCT — EMPLOYEE  (PSC Reg. 33 – 42)
# ─────────────────────────────────────────────────────────────────────────────
_SERIOUS_MISCONDUCT_EMPLOYEE = [
    _s(1,  'Show-Cause Notice Issued',
       'show_cause_notice',
       sla_days=2, is_working_days=True,
       responsible_role='compliance_unit',
       statutory_ref='PSC Reg. 33(1)',
       description='A show-cause notice is issued to the subject within 2 working days of the allegation being substantiated to warrant serious misconduct proceedings.'),

    _s(2,  'Subject Show-Cause Response',
       'show_cause_response',
       sla_days=5, is_working_days=True,
       responsible_role='employee_subject',
       statutory_ref='PSC Reg. 33(2)',
       description='Subject must provide a written response to the show-cause notice within 5 working days.'),

    _s(3,  'Interim Suspension Decision',
       'interim_suspension',
       sla_days=2, is_working_days=True,
       responsible_role='secretary_opsc',
       statutory_ref='PSC Reg. 34(1)',
       description='Appointing authority decides whether to impose interim suspension (with or without pay) pending investigation.',
       is_optional=True),

    _s(4,  'Independent Investigator Appointed',
       'investigator_appointed',
       sla_days=5, is_working_days=True,
       responsible_role='compliance_unit',
       statutory_ref='PSC Reg. 35(1)',
       description='An independent investigator or panel is appointed within 5 working days of the show-cause deadline.'),

    _s(5,  'Investigation Conducted',
       'investigation',
       sla_days=30, is_working_days=True,
       responsible_role='compliance_unit',
       statutory_ref='PSC Reg. 35(2)',
       description='Full disciplinary investigation conducted and completed within 30 working days of appointment.'),

    _s(6,  'Investigation Report to OPSC',
       'investigation_report',
       sla_days=5, is_working_days=True,
       responsible_role='compliance_unit',
       statutory_ref='PSC Reg. 36(1)',
       description='Investigator submits a written report with findings to the OPSC within 5 working days of completing the investigation.'),

    _s(7,  'PSC Preliminary Assessment',
       'psc_assessment',
       sla_days=5, is_working_days=True,
       responsible_role='secretary_opsc',
       statutory_ref='PSC Reg. 37(1)',
       description='PSC conducts a preliminary review of the investigation report to determine whether a formal hearing is warranted.'),

    _s(8,  'PSDB Referral',
       'psdb_referral',
       sla_days=5, is_working_days=True,
       responsible_role='secretary_opsc',
       statutory_ref='PSC Reg. 38(1)',
       description='If the subject contests the findings, the matter may be referred to the Public Service Disciplinary Board (PSDB).',
       is_optional=True),

    _s(9,  'Formal PSC / PSDB Hearing',
       'psc_hearing',
       sla_days=10, is_working_days=True,
       responsible_role='secretary_opsc',
       statutory_ref='PSC Reg. 39(1)',
       description='Formal hearing conducted where both parties present their case. Scheduled within 10 working days of the assessment.'),

    _s(10, 'PSC Decision & Sanction Issued',
       'psc_decision',
       sla_days=5, is_working_days=True,
       responsible_role='secretary_opsc',
       statutory_ref='PSC Reg. 40(1)',
       description='PSC issues a written decision and applies the appropriate sanction within 5 working days of the hearing.'),

    _s(11, 'Outcome Letter Issued to Subject',
       'outcome_letter',
       sla_days=3, is_working_days=True,
       responsible_role='compliance_unit',
       statutory_ref='PSC Reg. 41(1)',
       description='Written outcome letter formally notifying the subject of the decision and sanction within 3 working days.'),
]


# ─────────────────────────────────────────────────────────────────────────────
# 3. TEMPORARY SUSPENSION  (PSC Reg. 43 – 47)
# ─────────────────────────────────────────────────────────────────────────────
_TEMPORARY_SUSPENSION = [
    _s(1,  'Suspension Order Issued',
       'suspension_order',
       sla_days=1, is_working_days=True,
       responsible_role='secretary_opsc',
       statutory_ref='PSC Reg. 43(1)',
       description='The appointing authority issues a written suspension order within 1 working day of the trigger event.'),

    _s(2,  'Formal Allegation Notice Served',
       'allegation_notice',
       sla_days=3, is_working_days=True,
       responsible_role='compliance_unit',
       statutory_ref='PSC Reg. 43(2)',
       description='A formal notice of allegation detailing the grounds for suspension is served within 3 working days of the suspension order.'),

    _s(3,  'Subject Response Period',
       'subject_response',
       sla_days=5, is_working_days=True,
       responsible_role='employee_subject',
       statutory_ref='PSC Reg. 44(1)',
       description='Subject has 5 working days to respond in writing to the formal allegation notice.'),

    _s(4,  'Review by Appointing Authority',
       'authority_review',
       sla_days=5, is_working_days=True,
       responsible_role='secretary_opsc',
       statutory_ref='PSC Reg. 45(1)',
       description="The appointing authority reviews the subject's response and available evidence within 5 working days."),

    _s(5,  'Decision: Continue or Reinstate',
       'continuation_decision',
       sla_days=3, is_working_days=True,
       responsible_role='secretary_opsc',
       statutory_ref='PSC Reg. 46(1)',
       description='A formal decision is made to either continue the suspension and escalate to disciplinary proceedings, or reinstate the employee.'),

    _s(6,  'Outcome Communicated to Subject',
       'outcome_letter',
       sla_days=2, is_working_days=True,
       responsible_role='compliance_unit',
       statutory_ref='PSC Reg. 47(1)',
       description='Written notice of the decision is communicated to the subject within 2 working days.'),
]


# ─────────────────────────────────────────────────────────────────────────────
# 4. GRIEVANCE PROCESS  (PSC Reg. 48 – 56 / Employment Act s.57)
# ─────────────────────────────────────────────────────────────────────────────
_GRIEVANCE = [
    _s(1,  'Grievance Lodged & Acknowledged',
       'grievance_lodged',
       sla_days=2, is_working_days=True,
       responsible_role='compliance_unit',
       statutory_ref='PSC Reg. 48(1)',
       description='Grievance is formally received and an acknowledgement letter issued to the complainant within 2 working days.'),

    _s(2,  'MDC Assessment',
       'mdc_assessment',
       sla_days=5, is_working_days=True,
       responsible_role='mdc_panel_mediator',
       statutory_ref='PSC Reg. 49(1) / Employment Act s.57',
       description='The Mediation & Dispute Committee (MDC) conducts an initial assessment to determine appropriate resolution pathway within 1 working week (5 working days).'),

    _s(3,  'Conciliation / Mediation Conducted',
       'mediation',
       sla_days=21, is_working_days=True,
       responsible_role='mdc_panel_mediator',
       statutory_ref='PSC Reg. 50(1)',
       description='MDC-facilitated conciliation or mediation sessions conducted. Parties given up to 21 working days to reach a settlement.'),

    _s(4,  'Mediation Outcome Documented',
       'mediation_outcome',
       sla_days=3, is_working_days=True,
       responsible_role='mdc_panel_mediator',
       statutory_ref='PSC Reg. 51(1)',
       description='The MDC mediator documents the outcome (settled or not settled) in a formal report within 3 working days of the final session.'),

    _s(5,  'Referral to PSDB (if unresolved)',
       'psdb_referral',
       sla_days=5, is_working_days=True,
       responsible_role='compliance_unit',
       statutory_ref='PSC Reg. 52(1)',
       description='If mediation fails, the grievance is formally referred to the Public Service Disciplinary Board (PSDB) within 5 working days.',
       is_optional=True),

    _s(6,  'PSDB Hearing',
       'psdb_hearing',
       sla_days=14, is_working_days=True,
       responsible_role='secretary_opsc',
       statutory_ref='PSC Reg. 53(1)',
       description='PSDB schedules and conducts a formal grievance hearing within 14 working days of referral.',
       is_optional=True),

    _s(7,  'PSDB Determination Issued',
       'psdb_determination',
       sla_days=5, is_working_days=True,
       responsible_role='secretary_opsc',
       statutory_ref='PSC Reg. 54(1)',
       description='PSDB issues a written determination within 5 working days of the hearing.',
       is_optional=True),

    _s(8,  'Outcome Letter Issued',
       'outcome_letter',
       sla_days=3, is_working_days=True,
       responsible_role='compliance_unit',
       statutory_ref='PSC Reg. 55(1)',
       description='Final outcome letter issued to all parties within 3 working days of the determination or settled mediation.'),
]


# ─────────────────────────────────────────────────────────────────────────────
# 5. SENIOR EXECUTIVE — SERIOUS MISCONDUCT  (PSC Act s.22 – 29)
# ─────────────────────────────────────────────────────────────────────────────
_SENIOR_SERIOUS_MISCONDUCT = [
    _s(1,  'Allegation Referred to Commission',
       'allegation_referral',
       sla_days=3, is_working_days=True,
       responsible_role='compliance_unit',
       statutory_ref='PSC Act s.22(1)',
       description='Allegation against the senior executive is formally referred to the PSC/Commission within 3 working days of receipt.'),

    _s(2,  'Commission Preliminary Assessment',
       'commission_assessment',
       sla_days=10, is_working_days=True,
       responsible_role='commission_member',
       statutory_ref='PSC Act s.22(2)',
       description='The Commission conducts a preliminary assessment to determine whether the allegation warrants a formal inquiry. Completed within 10 working days (2 working weeks).'),

    _s(3,  'Notice of Allegation Issued to Executive',
       'allegation_notice',
       sla_days=5, is_working_days=True,
       responsible_role='secretary_opsc',
       statutory_ref='PSC Act s.23(1)',
       description='Commission issues a formal notice of allegation to the senior executive within 5 working days of the assessment decision.'),

    _s(4,  'Executive Response Period',
       'executive_response',
       sla_days=5, is_working_days=True,
       responsible_role='employee_subject',
       statutory_ref='PSC Act s.23(2)',
       description='Senior executive has 5 working days to lodge a written response to the notice of allegation.'),

    _s(5,  'Interim Suspension (if warranted)',
       'interim_suspension',
       sla_days=3, is_working_days=True,
       responsible_role='secretary_opsc',
       statutory_ref='PSC Act s.24(1)',
       description='Commission may recommend interim suspension of the senior executive pending the inquiry outcome.',
       is_optional=True),

    _s(6,  'Independent Investigator Appointed',
       'investigator_appointed',
       sla_days=5, is_working_days=True,
       responsible_role='commission_member',
       statutory_ref='PSC Act s.25(1)',
       description='Commission appoints an independent investigator or panel within 5 working days of the response deadline.'),

    _s(7,  'Investigation Conducted',
       'investigation',
       sla_days=45, is_working_days=True,
       responsible_role='compliance_unit',
       statutory_ref='PSC Act s.25(2)',
       description='Full independent investigation conducted within 45 working days of investigator appointment.'),

    _s(8,  'Investigation Report to Commission',
       'investigation_report',
       sla_days=5, is_working_days=True,
       responsible_role='compliance_unit',
       statutory_ref='PSC Act s.26(1)',
       description='Investigator submits the full report with findings and recommendations to the Commission within 5 working days of completing the investigation.'),

    _s(9,  'Commission Deliberation',
       'commission_deliberation',
       sla_days=21, is_working_days=False,  # calendar days per PSC Act
       responsible_role='commission_member',
       statutory_ref='PSC Act s.27(1)',
       description='Commission deliberates on the investigation report and prepares its formal determination. Statutory period is 21 calendar days.'),

    _s(10, 'Commission Determination Issued',
       'commission_determination',
       sla_days=10, is_working_days=True,
       responsible_role='commission_member',
       statutory_ref='PSC Act s.27(2)',
       description='Commission issues its formal written determination including recommended sanction within 10 working days of completing deliberation.'),

    _s(11, 'Commission Confirmation Period',
       'commission_confirmation',
       sla_days=45, is_working_days=False,  # statutory 45 calendar days
       responsible_role='commission_member',
       statutory_ref='PSC Act s.28(1)',
       description='The determination is subject to a 45-calendar-day confirmation period during which the executive may appeal to the Minister/PM before the sanction takes effect.'),

    _s(12, 'Referral to Minister / Prime Minister',
       'ministerial_referral',
       sla_days=5, is_working_days=True,
       responsible_role='secretary_opsc',
       statutory_ref='PSC Act s.29(1)',
       description='If the sanction requires Ministerial or PM approval, the Commission formally refers its determination within 5 working days of the confirmation period.',
       is_optional=True),

    _s(13, 'Decision Implemented',
       'decision_implemented',
       sla_days=5, is_working_days=True,
       responsible_role='compliance_unit',
       statutory_ref='PSC Act s.29(2)',
       description="The Commission's decision is formally implemented and the executive notified in writing within 5 working days of all approvals being in place."),
]


# ─────────────────────────────────────────────────────────────────────────────
# 6. SENIOR EXECUTIVE — POOR PERFORMANCE  (PSC Act s.30 – 38)
# ─────────────────────────────────────────────────────────────────────────────
_SENIOR_POOR_PERFORMANCE = [
    _s(1,  'Performance Concerns Documented',
       'performance_concerns',
       sla_days=5, is_working_days=True,
       responsible_role='compliance_unit',
       statutory_ref='PSC Act s.30(1)',
       description='Supervisor formally documents specific performance concerns and the standard not being met. Completed within 5 working days of concern identification.'),

    _s(2,  'Performance Improvement Notice Issued',
       'pip_notice',
       sla_days=3, is_working_days=True,
       responsible_role='secretary_opsc',
       statutory_ref='PSC Act s.30(2)',
       description='A formal Performance Improvement Notice is issued to the senior executive within 3 working days of concerns being documented.'),

    _s(3,  'PIP Plan Agreed & Commenced',
       'pip_commenced',
       sla_days=10, is_working_days=True,
       responsible_role='compliance_unit',
       statutory_ref='PSC Act s.31(1)',
       description='A Performance Improvement Plan (PIP) with measurable targets is agreed with the executive and formally commenced within 10 working days of the notice.'),

    _s(4,  'PIP Monitoring Period',
       'pip_monitoring',
       sla_days=90, is_working_days=False,  # 90 calendar days = ~3 months
       responsible_role='compliance_unit',
       statutory_ref='PSC Act s.31(2)',
       description='The executive is given 90 calendar days (approximately 3 months) to demonstrate measurable improvement against the PIP targets.'),

    _s(5,  'PIP Review Assessment',
       'pip_review',
       sla_days=10, is_working_days=True,
       responsible_role='compliance_unit',
       statutory_ref='PSC Act s.32(1)',
       description='Formal review assessment conducted at the end of the PIP period. Assessment documented within 10 working days of the PIP expiry.'),

    _s(6,  'Commission Assessment',
       'commission_assessment',
       sla_days=10, is_working_days=True,
       responsible_role='commission_member',
       statutory_ref='PSC Act s.33(1)',
       description='If performance has not improved sufficiently, the matter is referred to the Commission for a formal assessment within 10 working days of the PIP review.'),

    _s(7,  'PSDB Assessment (if contested)',
       'psdb_assessment',
       sla_days=10, is_working_days=True,
       responsible_role='secretary_opsc',
       statutory_ref='PSC Act s.34(1)',
       description='If the executive contests the poor performance finding, the matter may be reviewed by the PSDB within 10 working days of the commission assessment.',
       is_optional=True),

    _s(8,  'Commission Recommendation to Minister',
       'commission_recommendation',
       sla_days=10, is_working_days=True,
       responsible_role='commission_member',
       statutory_ref='PSC Act s.35(1)',
       description='Commission prepares and submits its formal recommendation (termination, demotion, or other action) to the relevant Minister within 10 working days.'),

    _s(9,  'Ministerial Decision',
       'ministerial_decision',
       sla_days=21, is_working_days=False,  # 21 calendar days per PSC Act
       responsible_role='secretary_opsc',
       statutory_ref='PSC Act s.36(1)',
       description="The Minister has 21 calendar days to accept, modify, or reject the Commission's recommendation."),

    _s(10, 'Commission Confirmation Period',
       'commission_confirmation',
       sla_days=45, is_working_days=False,  # statutory 45 calendar days
       responsible_role='commission_member',
       statutory_ref='PSC Act s.37(1)',
       description='The Ministerial decision is subject to a 45-calendar-day Commission confirmation period before it takes formal effect.'),

    _s(11, 'Decision Implemented',
       'decision_implemented',
       sla_days=5, is_working_days=True,
       responsible_role='compliance_unit',
       statutory_ref='PSC Act s.38(1)',
       description='The final decision is formally implemented and the executive notified in writing within 5 working days.'),
]


# ─────────────────────────────────────────────────────────────────────────────
# Registry
# ─────────────────────────────────────────────────────────────────────────────

WORKFLOW_STAGES = {
    'employee_disciplinary':       _EMPLOYEE_DISCIPLINARY,
    'serious_misconduct_employee': _SERIOUS_MISCONDUCT_EMPLOYEE,
    'temporary_suspension':        _TEMPORARY_SUSPENSION,
    'grievance':                   _GRIEVANCE,
    'senior_serious_misconduct':   _SENIOR_SERIOUS_MISCONDUCT,
    'senior_poor_performance':     _SENIOR_POOR_PERFORMANCE,
}


def get_stages_for_family(family: str) -> list:
    """Return the ordered stage definitions for a case family."""
    return WORKFLOW_STAGES.get(family, [])


def get_total_sla_summary(family: str) -> dict:
    """
    Return a summary of the total SLA burden for a case family.
    Distinguishes between mandatory and optional stages, and between
    working-day and calendar-day SLAs.
    """
    stages = get_stages_for_family(family)
    mandatory = [s for s in stages if not s['is_optional']]
    optional  = [s for s in stages if s['is_optional']]

    def _totals(lst):
        wd = sum(s['sla_days'] for s in lst if s['is_working_days'])
        cd = sum(s['sla_days'] for s in lst if not s['is_working_days'])
        return {'working_days': wd, 'calendar_days': cd}

    return {
        'family':    family,
        'mandatory': _totals(mandatory),
        'optional':  _totals(optional),
        'stage_count': {'mandatory': len(mandatory), 'optional': len(optional)},
    }
