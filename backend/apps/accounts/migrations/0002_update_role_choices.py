from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[
                    ('superadmin',         'Super Administrator'),
                    ('admin',              'Administrator'),
                    ('compliance_unit',    'Compliance Unit'),
                    ('secretary_opsc',     'Secretary OPSC'),
                    ('commission_member',  'Commission Member'),
                    ('dg_director',        'DG / Director'),
                    ('mdc_panel_mediator', 'MDC / Panel / Mediator'),
                    ('employee_subject',   'Employee / Subject'),
                ],
                default='employee_subject',
                max_length=30,
            ),
        ),
    ]
