from django.db import migrations, models


def clear_sop_reference(apps, schema_editor):
    SystemSettings = apps.get_model('system', 'SystemSettings')
    SystemSettings.objects.filter(sop_reference='IPDU-SOP-001').update(sop_reference='')


class Migration(migrations.Migration):

    dependencies = [
        ('system', '0002_alter_systemsettings_timezone_display'),
    ]

    operations = [
        migrations.RunPython(clear_sop_reference, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='systemsettings',
            name='sop_reference',
            field=models.CharField(blank=True, default='', max_length=64),
        ),
    ]
