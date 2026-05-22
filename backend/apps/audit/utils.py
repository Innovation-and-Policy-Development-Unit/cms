from .models import AuditLog


def log_audit(user, action: str, resource_type: str, resource_id, description: str, ip_address=None):
    AuditLog.objects.create(
        user=user,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        description=description,
        ip_address=ip_address,
    )
