"""
Management command: python manage.py seed

Creates a full set of realistic sample data:
  - One user per role (password: Password123!)
  - 12 cases spread across all 6 case families and multiple statuses
  - Workflow stages (some completed, some in-progress, some pending)
  - Decisions, litigation records, audit log entries
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
import random

from apps.accounts.models import User
from apps.cases.models import (
    Case, CaseStage, Decision, LitigationRecord, CaseNote,
    CaseFamily, CaseStatus, StageStatus, SLAStatus, DecisionOutcome,
)
from apps.audit.models import AuditLog


USERS = [
    dict(username='superadmin',  password='Password123!', first_name='Sarah',   last_name='Toka',      role='superadmin',         email='superadmin@opsc.gov.vu',   department='OPSC Executive',     phone='+678 22001'),
    dict(username='admin',       password='Password123!', first_name='James',   last_name='Malau',     role='admin',              email='admin@opsc.gov.vu',        department='IPDU',               phone='+678 22002'),
    dict(username='compliance1', password='Password123!', first_name='Marie',   last_name='Vira',      role='compliance_unit',    email='mvira@opsc.gov.vu',        department='Compliance Unit',    phone='+678 22003'),
    dict(username='compliance2', password='Password123!', first_name='Peter',   last_name='Naupa',     role='compliance_unit',    email='pnaupa@opsc.gov.vu',       department='Compliance Unit',    phone='+678 22004'),
    dict(username='s.compliance', password='Password123!', first_name='Sam',     last_name='Kalsakau',  role='compliance_senior',  email='scompliance@opsc.gov.vu',  department='Compliance Unit',    phone='+678 22008'),
    dict(username='p.compliance', password='Password123!', first_name='Patricia',last_name='Wilson',    role='compliance_principal', email='pcompliance@opsc.gov.vu', department='Compliance Unit',    phone='+678 22009'),
    dict(username='m.compliance', password='Password123!', first_name='Michael', last_name='Tari',    role='compliance_manager', email='mcompliance@opsc.gov.vu',  department='Compliance Unit',    phone='+678 22011'),
    dict(username='secretary',   password='Password123!', first_name='Grace',   last_name='Moli',      role='secretary_opsc',     email='gmoli@opsc.gov.vu',        department='Office of Secretary',phone='+678 22005'),
    dict(username='commission1', password='Password123!', first_name='Robert',  last_name='Tambe',     role='commission_member',  email='rtambe@opsc.gov.vu',       department='PSC Commission',     phone='+678 22006'),
    dict(username='commission2', password='Password123!', first_name='Alice',   last_name='Bong',      role='commission_member',  email='abong@opsc.gov.vu',        department='PSC Commission',     phone='+678 22007'),
    dict(username='dg1',         password='Password123!', first_name='William', last_name='Shem',      role='dg_director',        email='wshem@finance.gov.vu',     department='Ministry of Finance',phone='+678 25001'),
    dict(username='mediator1',   password='Password123!', first_name='Susan',   last_name='Kalo',      role='mdc_panel_mediator', email='skalo@opsc.gov.vu',        department='MDC Panel',          phone='+678 22010'),
    dict(username='employee1',   password='Password123!', first_name='John',    last_name='Rarua',     role='employee_subject',   email='jrarua@health.gov.vu',     department='Ministry of Health', phone='+678 27001'),
    dict(username='employee2',   password='Password123!', first_name='Anna',    last_name='Livo',      role='employee_subject',   email='alivo@education.gov.vu',   department='Ministry of Education',phone='+678 28001'),
    dict(username='employee3',   password='Password123!', first_name='Tom',     last_name='Molisa',    role='employee_subject',   email='tmolisa@lands.gov.vu',     department='Ministry of Lands',  phone='+678 29001'),
]

CASES_DATA = [
    # (case_family, subject_name, subject_position, subject_ministry, is_senior, status, days_ago)
    ('employee_disciplinary',       'John Rarua',       'Administrative Officer',    'Ministry of Health',     False, 'active',   45),
    ('employee_disciplinary',       'Anna Livo',        'Senior Clerk',              'Ministry of Education',  False, 'active',   12),
    ('serious_misconduct_employee', 'Tom Molisa',       'Finance Officer',           'Ministry of Lands',      False, 'active',   30),
    ('serious_misconduct_employee', 'David Kanas',      'Procurement Officer',       'Ministry of Finance',    False, 'closed',   90),
    ('temporary_suspension',        'Mark Tavui',       'IT Officer',                'Ministry of Health',     False, 'active',   8),
    ('temporary_suspension',        'Rose Kalmet',      'Senior Accountant',         'Ministry of Finance',    False, 'on_hold',  20),
    ('grievance',                   'Lisa Nari',        'Education Officer',         'Ministry of Education',  False, 'active',   15),
    ('grievance',                   'Paul Vatu',        'Health Inspector',          'Ministry of Health',     False, 'closed',   60),
    ('senior_serious_misconduct',   'William Shem',     'Director General',          'Ministry of Finance',    True,  'active',   25),
    ('senior_serious_misconduct',   'Helen Tari',       'Secretary General',         'Ministry of Infrastructure', True, 'closed', 120),
    ('senior_poor_performance',     'George Mele',      'Director',                  'Ministry of Tourism',    True,  'active',   40),
    ('senior_poor_performance',     'Carol Yama',       'Director General',          'Ministry of Agriculture', True, 'active',  55),
]


class Command(BaseCommand):
    help = 'Seed the database with realistic sample data'

    def add_arguments(self, parser):
        parser.add_argument('--flush', action='store_true', help='Delete all existing data first')

    def handle(self, *args, **options):
        if options['flush']:
            self.stdout.write('Flushing existing data...')
            AuditLog.objects.all().delete()
            CaseNote.objects.all().delete()
            LitigationRecord.objects.all().delete()
            Decision.objects.all().delete()
            CaseStage.objects.all().delete()
            Case.objects.all().delete()
            User.objects.filter(username__in=[u['username'] for u in USERS]).delete()

        # ── Users ──────────────────────────────────────────────────────────
        self.stdout.write('Creating users...')
        user_map = {}
        for u in USERS:
            obj, created = User.objects.get_or_create(
                username=u['username'],
                defaults={k: v for k, v in u.items() if k != 'password'},
            )
            if created:
                obj.set_password(u['password'])
                obj.save()
            user_map[u['username']] = obj
        self.stdout.write(self.style.SUCCESS(f'  {len(user_map)} users ready'))

        admin_user     = user_map['admin']
        compliance     = user_map['compliance1']
        secretary      = user_map['secretary']

        # ── Cases + Stages ─────────────────────────────────────────────────
        self.stdout.write('Creating cases and stages...')
        from apps.cases.workflow import get_stages_for_family, compute_due_date

        cases_created = 0
        for (family, subject, position, ministry, is_senior, status, days_ago) in CASES_DATA:
            date_received = date.today() - timedelta(days=days_ago)

            case = Case.objects.create(
                case_family=family,
                status=status,
                subject_name=subject,
                subject_position=position,
                subject_ministry=ministry,
                is_senior_executive=is_senior,
                initiating_officer=compliance,
                assigned_officer=secretary,
                date_received=date_received,
                description=f'Case opened regarding {subject} of {ministry}.',
            )

            if status == 'closed':
                case.date_closed = timezone.now() - timedelta(days=random.randint(5, 30))
                case.save(update_fields=['date_closed'])

            # Build stages from workflow definition
            stage_defs = get_stages_for_family(family)
            completed_count = random.randint(1, max(1, len(stage_defs) - 2)) if status == 'active' else len(stage_defs)

            for i, sd in enumerate(stage_defs):
                order = i + 1
                if order <= completed_count:
                    stage_status = StageStatus.COMPLETED
                    due = compute_due_date(date_received, sd['sla_days'], sd['is_working_days'])
                    started = timezone.now() - timedelta(days=days_ago - (i * 3))
                    completed = started + timedelta(days=sd['sla_days'] - 1)
                elif order == completed_count + 1 and status == 'active':
                    stage_status = StageStatus.IN_PROGRESS
                    due = compute_due_date(date_received, sd['sla_days'], sd['is_working_days'])
                    started = timezone.now() - timedelta(days=random.randint(1, 5))
                    completed = None
                else:
                    stage_status = StageStatus.PENDING
                    due = None
                    started = None
                    completed = None

                CaseStage.objects.create(
                    case=case,
                    stage_name=sd['name'],
                    stage_order=order,
                    stage_code=sd['stage_code'],
                    responsible_role=sd['responsible_role'],
                    statutory_ref=sd['statutory_ref'],
                    sla_days=sd['sla_days'],
                    sla_working_days=sd['is_working_days'],
                    is_optional=sd['is_optional'],
                    status=stage_status,
                    due_date=due,
                    started_at=started,
                    completed_at=completed,
                )

            cases_created += 1

        self.stdout.write(self.style.SUCCESS(f'  {cases_created} cases ready'))

        # ── Decisions ──────────────────────────────────────────────────────
        self.stdout.write('Creating decisions...')
        closed_cases = Case.objects.filter(status='closed')
        outcomes = [
            DecisionOutcome.TERMINATE, DecisionOutcome.WARN,
            DecisionOutcome.REINSTATE, DecisionOutcome.SETTLED,
        ]
        for c in closed_cases:
            Decision.objects.get_or_create(
                case=c,
                defaults=dict(
                    decided_by_role='secretary_opsc',
                    decided_by_name='Grace Moli',
                    outcome=random.choice(outcomes),
                    decided_at=date.today() - timedelta(days=random.randint(5, 20)),
                    narrative=f'After thorough review of all evidence and submissions, the Commission has reached a formal determination on this matter.',
                    created_by=secretary,
                ),
            )
        self.stdout.write(self.style.SUCCESS(f'  {closed_cases.count()} decisions ready'))

        # ── Litigation records ─────────────────────────────────────────────
        self.stdout.write('Creating litigation records...')
        senior_cases = Case.objects.filter(case_family__in=['senior_serious_misconduct', 'senior_poor_performance'])
        for c in senior_cases[:2]:
            LitigationRecord.objects.get_or_create(
                case=c,
                defaults=dict(
                    description=f'Judicial review application filed by {c.subject_name}.',
                    legal_counsel='Kalsakau & Associates',
                    court_reference=f'SC-{c.date_received.year}-{c.id:04d}',
                    status='active',
                    estimated_cost=25000,
                    date_initiated=c.date_received + timedelta(days=14),
                ),
            )
        self.stdout.write(self.style.SUCCESS('  Litigation records ready'))

        # ── Case notes ─────────────────────────────────────────────────────
        self.stdout.write('Creating internal notes...')
        active_cases = Case.objects.filter(status='active')[:4]
        notes = [
            'Subject has requested an extension to submit their response. Approved for 2 additional days.',
            'Legal counsel contacted regarding representation. Awaiting confirmation.',
            'Investigation committee convened. Site visit scheduled for next week.',
            'Evidence package received from Ministry HR. Indexed and stored securely.',
        ]
        for i, c in enumerate(active_cases):
            CaseNote.objects.get_or_create(
                case=c, author=compliance,
                defaults=dict(text=notes[i % len(notes)]),
            )
        self.stdout.write(self.style.SUCCESS('  Case notes ready'))

        # ── Audit log ──────────────────────────────────────────────────────
        self.stdout.write('Creating audit log entries...')
        audit_entries = []
        for c in Case.objects.all()[:6]:
            audit_entries.append(AuditLog(
                user=admin_user,
                action='create',
                resource_type='Case',
                resource_id=str(c.id),
                description=f'Case {c.reference_number} opened for {c.subject_name}.',
                ip_address='10.0.0.1',
                timestamp=timezone.now() - timedelta(days=random.randint(1, 30)),
            ))
        AuditLog.objects.bulk_create(audit_entries, ignore_conflicts=True)
        self.stdout.write(self.style.SUCCESS('  Audit log ready'))

        # ── Summary ────────────────────────────────────────────────────────
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('✓ Seed complete'))
        self.stdout.write(f'  Users:  {User.objects.count()}')
        self.stdout.write(f'  Cases:  {Case.objects.count()}')
        self.stdout.write(f'  Stages: {CaseStage.objects.count()}')
        self.stdout.write('')
        self.stdout.write('Login credentials (all passwords: Password123!):')
        for u in USERS:
            self.stdout.write(f'  {u["username"]:<15} role: {u["role"]}')
