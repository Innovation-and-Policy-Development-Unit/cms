"""Seed system settings and form template catalog. Run: python manage.py seed_system"""

from django.core.management.base import BaseCommand

from apps.system.models import FormTemplate, SystemSettings

FORM_TEMPLATES = [
    ('Disciplinary', 'Notice of Allegation', 'IPDU-F-001',
     'Initial notice sent to subject outlining the allegation.', 10),
    ('Disciplinary', 'Show Cause Notice', 'IPDU-F-002',
     'Formal request for the subject to show cause.', 20),
    ('Disciplinary', 'Investigation Report Template', 'IPDU-F-003',
     'Structured report for investigating officers.', 30),
    ('Disciplinary', 'Disciplinary Committee Recommendation', 'IPDU-F-004',
     'Formal committee outcome and recommendation.', 40),
    ('Grievance', 'Grievance Lodgment Form', 'IPDU-F-010',
     'Form completed by the aggrieved party.', 10),
    ('Grievance', 'Grievance Outcome Letter', 'IPDU-F-011',
     'Formal outcome communication to parties.', 20),
    ('Senior Executive', 'Senior Executive Notice of Suspension', 'IPDU-F-020',
     'Temporary suspension notice for DG/Director level.', 10),
    ('Senior Executive', 'Commission Referral Letter', 'IPDU-F-021',
     'Referral to the Public Service Commission.', 20),
    ('General', 'Acknowledgement of Receipt', 'IPDU-F-030',
     'Confirmation letter to the complainant.', 10),
    ('General', 'Extension of Time Request', 'IPDU-F-031',
     'Request for statutory deadline extension.', 20),
    ('General', 'Case Closure Notification', 'IPDU-F-032',
     'Formal closure communicated to all parties.', 30),
]


class Command(BaseCommand):
    help = 'Seed system settings singleton and IPDU form template catalog'

    def handle(self, *args, **options):
        SystemSettings.load()
        self.stdout.write(self.style.SUCCESS('  System settings ready (pk=1)'))

        for category, name, code, description, sort_order in FORM_TEMPLATES:
            FormTemplate.objects.update_or_create(
                code=code,
                defaults={
                    'category': category,
                    'name': name,
                    'description': description,
                    'sort_order': sort_order,
                    'is_active': True,
                },
            )
        self.stdout.write(self.style.SUCCESS(f'  Form templates: {FormTemplate.objects.count()}'))
