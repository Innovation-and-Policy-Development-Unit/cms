from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='SystemSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('organisation_name', models.CharField(default='Office of the Public Service Commission', max_length=200)),
                ('system_code', models.CharField(default='CCMS', max_length=32)),
                ('sop_reference', models.CharField(default='IPDU-SOP-001', max_length=64)),
                ('timezone_display', models.CharField(default='Pacific/Efate (UTC+11)', max_length=64)),
                ('sla_at_risk_days', models.PositiveSmallIntegerField(default=3)),
                ('sla_critical_days', models.PositiveSmallIntegerField(default=1)),
                ('system_email', models.EmailField(default='no-reply@opsc.gov.vu', max_length=254)),
                ('admin_notification_email', models.EmailField(default='ipdu@opsc.gov.vu', max_length=254)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'System settings',
                'verbose_name_plural': 'System settings',
            },
        ),
        migrations.CreateModel(
            name='FormTemplate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('category', models.CharField(max_length=64)),
                ('name', models.CharField(max_length=200)),
                ('code', models.CharField(max_length=32, unique=True)),
                ('description', models.TextField(blank=True)),
                ('file', models.FileField(blank=True, upload_to='form_templates/%Y/')),
                ('sort_order', models.PositiveSmallIntegerField(default=0)),
                ('is_active', models.BooleanField(default=True)),
            ],
            options={
                'ordering': ['category', 'sort_order', 'code'],
            },
        ),
    ]
