from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        SUPERADMIN         = 'superadmin',         'Super Administrator'
        ADMIN              = 'admin',              'Administrator'
        COMPLIANCE_MANAGER = 'compliance_manager', 'Compliance Manager'
        COMPLIANCE_SENIOR  = 'compliance_senior',  'Compliance Senior Officer'
        COMPLIANCE_PRINCIPAL = 'compliance_principal', 'Compliance Principal'
        COMPLIANCE_UNIT    = 'compliance_unit',    'Compliance Unit (legacy)'
        SECRETARY_OPSC     = 'secretary_opsc',     'Secretary OPSC'
        COMMISSION_MEMBER  = 'commission_member',  'Commission Member'
        DG_DIRECTOR        = 'dg_director',        'DG / Director'
        MDC_PANEL_MEDIATOR = 'mdc_panel_mediator', 'MDC / Panel / Mediator'
        EMPLOYEE_SUBJECT   = 'employee_subject',   'Employee / Subject'

    role       = models.CharField(max_length=30, choices=Role.choices, default=Role.EMPLOYEE_SUBJECT)
    phone      = models.CharField(max_length=20, blank=True)
    department = models.CharField(max_length=100, blank=True)
    is_active  = models.BooleanField(default=True)

    ADMIN_ROLES = {Role.SUPERADMIN, Role.ADMIN}

    class Meta:
        db_table = 'accounts_user'

    def __str__(self):
        return f'{self.get_full_name()} ({self.role})'

    @property
    def is_system_admin(self):
        return self.role in self.ADMIN_ROLES

    @property
    def can_manage_cases(self):
        return self.role in {
            self.Role.SUPERADMIN, self.Role.ADMIN,
            self.Role.COMPLIANCE_MANAGER,
            self.Role.COMPLIANCE_SENIOR,
            self.Role.COMPLIANCE_PRINCIPAL,
            self.Role.COMPLIANCE_UNIT,
            self.Role.SECRETARY_OPSC,
        }
