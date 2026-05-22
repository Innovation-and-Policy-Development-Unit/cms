from django.db import models


class SystemSettings(models.Model):
    """Singleton-style organisation and SLA notification defaults."""

    organisation_name = models.CharField(max_length=200, default='Office of the Public Service Commission')
    system_code = models.CharField(max_length=32, default='CCMS')
    sop_reference = models.CharField(max_length=64, blank=True, default='')
    timezone_display = models.CharField(
        max_length=64,
        default='Pacific/Efate (UTC+11)',
        help_text='Display label; Django TIME_ZONE remains authoritative.',
    )
    sla_at_risk_days = models.PositiveSmallIntegerField(default=3)
    sla_critical_days = models.PositiveSmallIntegerField(default=1)
    system_email = models.EmailField(default='no-reply@opsc.gov.vu')
    admin_notification_email = models.EmailField(default='ipdu@opsc.gov.vu')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'System settings'
        verbose_name_plural = 'System settings'

    def __str__(self):
        return f'{self.system_code} settings'

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class FormTemplate(models.Model):
    """IPDU form / letter catalog (reference; optional file attachment)."""

    category = models.CharField(max_length=64)
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=32, unique=True)
    description = models.TextField(blank=True)
    file = models.FileField(upload_to='form_templates/%Y/', blank=True)
    sort_order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['category', 'sort_order', 'code']

    def __str__(self):
        return f'{self.code} — {self.name}'
