import { useAuthStore } from '@/stores/authStore'
import { hasPermission, type Permission } from '@/lib/permissions'

interface Props {
  permission: Permission
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Renders children only when the current user holds the required permission.
 * Permission array is sourced from the JWT /users/me/ response stored in authStore.
 *
 * Usage:
 *   <HasPermission permission="createCase">
 *     <Button>New Case</Button>
 *   </HasPermission>
 *
 *   <HasPermission permission="deleteDocs" fallback={<span>No access</span>}>
 *     <DeleteButton />
 *   </HasPermission>
 */
export function HasPermission({ permission, children, fallback = null }: Props) {
  const permissions = useAuthStore((s) => s.user?.permissions)
  return hasPermission(permissions, permission) ? <>{children}</> : <>{fallback}</>
}
