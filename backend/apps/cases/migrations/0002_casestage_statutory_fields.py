from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cases', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='casestage',
            name='stage_code',
            field=models.CharField(blank=True, max_length=60),
        ),
        migrations.AddField(
            model_name='casestage',
            name='sla_days',
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='casestage',
            name='sla_working_days',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='casestage',
            name='is_optional',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='casestage',
            name='statutory_ref',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='casestage',
            name='responsible_role',
            field=models.CharField(blank=True, max_length=40),
        ),
    ]
