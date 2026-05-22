"""Add CDP (Commission Decision Portal) linkage fields to Case."""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cases', '0003_casenote'),
    ]

    operations = [
        migrations.AddField(
            model_name='case',
            name='cdp_submission_id',
            field=models.CharField(
                blank=True,
                db_index=True,
                default='',
                help_text='CDP reference number, e.g. PSC-2026-00001. Set when the case originates from the portal.',
                max_length=50,
            ),
        ),
        migrations.AddField(
            model_name='case',
            name='cdp_submission_ref',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Human-readable CDP title / label (denormalised for display).',
                max_length=100,
            ),
        ),
        migrations.AddField(
            model_name='case',
            name='cdp_callback_url',
            field=models.URLField(
                blank=True,
                default='',
                help_text='CDP webhook URL to call when compliance manager signs off.',
                max_length=500,
            ),
        ),
    ]
