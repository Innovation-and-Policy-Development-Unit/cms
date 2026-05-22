from django.db import models
from apps.accounts.models import User


class Notification(models.Model):
    class NotifType(models.TextChoices):
        SLA_WARNING = 'sla_warning', 'SLA Warning'
        STAGE_ASSIGNED = 'stage_assigned', 'Stage Assigned'
        CASE_CLOSED = 'case_closed', 'Case Closed'
        DECISION_ADDED = 'decision_added', 'Decision Added'
        GENERAL = 'general', 'General'

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notif_type = models.CharField(max_length=30, choices=NotifType.choices, default=NotifType.GENERAL)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    related_case_id = models.BigIntegerField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.notif_type} → {self.recipient}'
