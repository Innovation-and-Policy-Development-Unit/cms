import type { BreadcrumbItem } from '@/components/layout/Breadcrumbs'

const ADMIN_LABELS: Record<string, string> = {
  '/admin/users': 'Users',
  '/admin/roles': 'Roles & Permissions',
  '/admin/groups': 'Groups',
  '/admin/workflow-config': 'Workflow Config',
  '/admin/forms': 'Forms & Templates',
  '/admin/settings': 'System Settings',
}

const REPORT_LABELS: Record<string, string> = {
  '/reports/statistics': 'Case Statistics',
  '/reports/compliance': 'Compliance Report',
  '/reports/litigation': 'Litigation & Costs',
}

const WORKFLOW_LABELS: Record<string, string> = {
  '/workflows/active': 'Pipeline overview',
  '/workflows/my-tasks': 'My Tasks',
}

/** Breadcrumbs for routes that do not render their own trail (admin, reports, etc.). */
export function breadcrumbsForPath(pathname: string): BreadcrumbItem[] | null {
  if (pathname.startsWith('/admin/')) {
    const leaf = ADMIN_LABELS[pathname]
    if (!leaf) return null
    return [
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Administration' },
      { label: leaf },
    ]
  }
  if (pathname.startsWith('/reports/')) {
    const leaf = REPORT_LABELS[pathname]
    if (!leaf) return null
    return [
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Reports' },
      { label: leaf },
    ]
  }
  if (pathname === '/approvals') {
    return [
      { label: 'Cases', to: '/cases' },
      { label: 'Approval queue' },
    ]
  }
  const wf = WORKFLOW_LABELS[pathname]
  if (wf) {
    return [
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Workflows' },
      { label: wf },
    ]
  }
  if (pathname === '/audit') {
    return [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Audit Trail' }]
  }
  if (pathname === '/documents') {
    return [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Documents' }]
  }
  return null
}
