"""Create in-app notifications for CCMS users."""

from .models import Notification


def notify_user(
    user,
    *,
    title: str,
    message: str,
    notif_type: str = Notification.NotifType.GENERAL,
    related_case_id: int | None = None,
) -> Notification | None:
    if user is None or not getattr(user, 'pk', None):
        return None
    return Notification.objects.create(
        recipient=user,
        notif_type=notif_type,
        title=title,
        message=message,
        related_case_id=related_case_id,
    )
