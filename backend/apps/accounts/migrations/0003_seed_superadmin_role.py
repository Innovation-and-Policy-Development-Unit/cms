"""
Data migration: promote existing superusers → role='superadmin'
and remap any old role values that may still be in the database.
"""
from django.db import migrations

OLD_TO_NEW = {
    # old values that may exist from the original schema
    'ipdu_manager':         'compliance_unit',
    'investigating_officer':'compliance_unit',
    'reviewing_officer':    'compliance_unit',
    'legal_officer':        'compliance_unit',
    'secretary':            'secretary_opsc',
    'commissioner':         'commission_member',
    'readonly':             'employee_subject',
    # already-correct values are left untouched by the loop below
}


def forwards(apps, schema_editor):
    User = apps.get_model('accounts', 'User')

    # 1. Any Django superuser → superadmin
    User.objects.filter(is_superuser=True).update(role='superadmin')

    # 2. Remap stale old-schema role strings
    for old, new in OLD_TO_NEW.items():
        User.objects.filter(role=old).update(role=new)


def backwards(apps, schema_editor):
    # Non-destructive: just reset everything to the default
    User = apps.get_model('accounts', 'User')
    User.objects.filter(role='superadmin').update(role='employee_subject')


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_update_role_choices'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
