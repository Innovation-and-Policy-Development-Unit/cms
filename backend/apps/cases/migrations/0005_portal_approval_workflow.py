"""Portal approval fields and compliance role alignment on cases."""

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('cases', '0004_cdp_integration'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='case',
            name='portal_form_type_code',
            field=models.CharField(
                blank=True,
                default='',
                help_text='SCDMS COMP-* form type when registered with the Commission Portal.',
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name='case',
            name='portal_approval_status',
            field=models.CharField(
                choices=[
                    ('draft', 'Draft'),
                    ('pending_manager', 'Pending Manager Approval'),
                    ('approved', 'Approved for Portal'),
                    ('rejected', 'Rejected'),
                    ('sent_to_portal', 'Sent to Commission Portal'),
                ],
                default='draft',
                max_length=24,
            ),
        ),
        migrations.AddField(
            model_name='case',
            name='initiator_compliance_role',
            field=models.CharField(blank=True, default='', max_length=32),
        ),
        migrations.AddField(
            model_name='case',
            name='portal_approved_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='portal_approved_cases',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='case',
            name='portal_approved_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='case',
            name='portal_approval_notes',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='case',
            name='portal_sent_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
