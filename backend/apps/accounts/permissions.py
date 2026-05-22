from rest_framework.permissions import BasePermission

ADMIN_ROLES = {'superadmin', 'admin'}


class IsAdminRole(BasePermission):
    """Allow access only to users whose role is superadmin or admin."""

    message = 'You do not have permission to perform this action.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'role', None) in ADMIN_ROLES
        )
