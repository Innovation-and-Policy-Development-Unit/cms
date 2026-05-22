import { createRouter, createRoute, createRootRoute, redirect, Outlet } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import { can } from '@/lib/permissions'

import LoginPage              from '@/features/auth/LoginPage'
import AppLayout              from '@/components/layout/AppLayout'
import DashboardPage          from '@/features/dashboard/DashboardPage'
import CaseListPage           from '@/features/cases/CaseListPage'
import CaseDetailPage         from '@/features/cases/CaseDetailPage'
import DocumentsPage          from '@/features/documents/DocumentsPage'
import AuditPage              from '@/features/audit/AuditPage'
import ActiveWorkflowsPage    from '@/features/workflows/ActiveWorkflowsPage'
import MyTasksPage            from '@/features/workflows/MyTasksPage'
import CaseStatisticsPage     from '@/features/reports/CaseStatisticsPage'
import ComplianceReportPage   from '@/features/reports/ComplianceReportPage'
import LitigationCostsPage    from '@/features/reports/LitigationCostsPage'
import UserManagementPage     from '@/features/admin/UserManagementPage'
import RolesPermissionsPage   from '@/features/admin/RolesPermissionsPage'
import GroupsPage             from '@/features/admin/GroupsPage'
import FormsTemplatesPage     from '@/features/admin/FormsTemplatesPage'
import WorkflowConfigPage     from '@/features/admin/WorkflowConfigPage'
import SystemSettingsPage     from '@/features/admin/SystemSettingsPage'

/* ─── Helpers ──────────────────────────────────────────────────────────── */
function getRole() { return useAuthStore.getState().user?.role ?? '' }

const rootRoute = createRootRoute({ component: Outlet })

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
  beforeLoad: () => {
    if (useAuthStore.getState().isAuthenticated) throw redirect({ to: '/dashboard' })
  },
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: useAuthStore.getState().isAuthenticated ? '/dashboard' : '/login' })
  },
})

/* ─── Auth guard ────────────────────────────────────────────────────────── */
const authLayout = createRoute({
  getParentRoute: () => rootRoute,
  id: '_auth',
  component: AppLayout,
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) throw redirect({ to: '/login' })
  },
})

/* ─── Admin-only layout ─────────────────────────────────────────────────── */
const adminLayout = createRoute({
  getParentRoute: () => authLayout,
  id: '_admin',
  component: Outlet,
  beforeLoad: () => {
    if (!can(getRole(), 'adminSection')) throw redirect({ to: '/dashboard' })
  },
})

/* ─── Reports layout ────────────────────────────────────────────────────── */
const reportsLayout = createRoute({
  getParentRoute: () => authLayout,
  id: '_reports',
  component: Outlet,
  beforeLoad: () => {
    if (!can(getRole(), 'reportsAccess')) throw redirect({ to: '/dashboard' })
  },
})

/* ─── Audit layout ──────────────────────────────────────────────────────── */
const auditLayout = createRoute({
  getParentRoute: () => authLayout,
  id: '_audit',
  component: Outlet,
  beforeLoad: () => {
    if (!can(getRole(), 'auditTrail')) throw redirect({ to: '/dashboard' })
  },
})

/* ─── Active workflows layout ───────────────────────────────────────────── */
const workflowsLayout = createRoute({
  getParentRoute: () => authLayout,
  id: '_workflows',
  component: Outlet,
  beforeLoad: () => {
    if (!can(getRole(), 'activeWorkflows')) throw redirect({ to: '/dashboard' })
  },
})

/* ─── Routes ────────────────────────────────────────────────────────────── */
const dashboardRoute         = createRoute({ getParentRoute: () => authLayout,      path: '/dashboard',              component: DashboardPage })
const casesRoute             = createRoute({ getParentRoute: () => authLayout,      path: '/cases',                  component: CaseListPage })
const caseDetailRoute        = createRoute({ getParentRoute: () => authLayout,      path: '/cases/$id',              component: CaseDetailPage })
const myTasksRoute           = createRoute({ getParentRoute: () => authLayout,      path: '/workflows/my-tasks',     component: MyTasksPage })
const documentsRoute         = createRoute({ getParentRoute: () => authLayout,      path: '/documents',              component: DocumentsPage })
const activeWorkflowsRoute   = createRoute({ getParentRoute: () => workflowsLayout, path: '/workflows/active',       component: ActiveWorkflowsPage })
const auditRoute             = createRoute({ getParentRoute: () => auditLayout,     path: '/audit',                  component: AuditPage })
const caseStatisticsRoute    = createRoute({ getParentRoute: () => reportsLayout,   path: '/reports/statistics',     component: CaseStatisticsPage })
const complianceReportRoute  = createRoute({ getParentRoute: () => reportsLayout,   path: '/reports/compliance',     component: ComplianceReportPage })
const litigationCostsRoute   = createRoute({ getParentRoute: () => reportsLayout,   path: '/reports/litigation',     component: LitigationCostsPage })

// Administration (admin-only)
const userManagementRoute    = createRoute({ getParentRoute: () => adminLayout,     path: '/admin/users',            component: UserManagementPage })
const rolesPermissionsRoute  = createRoute({ getParentRoute: () => adminLayout,     path: '/admin/roles',            component: RolesPermissionsPage })
const groupsRoute            = createRoute({ getParentRoute: () => adminLayout,     path: '/admin/groups',           component: GroupsPage })
const formsTemplatesRoute    = createRoute({ getParentRoute: () => adminLayout,     path: '/admin/forms',            component: FormsTemplatesPage })
const workflowConfigRoute    = createRoute({ getParentRoute: () => adminLayout,     path: '/admin/workflow-config',  component: WorkflowConfigPage })
const systemSettingsRoute    = createRoute({ getParentRoute: () => adminLayout,     path: '/admin/settings',         component: SystemSettingsPage })

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  authLayout.addChildren([
    dashboardRoute,
    casesRoute,
    caseDetailRoute,
    myTasksRoute,
    documentsRoute,
    workflowsLayout.addChildren([activeWorkflowsRoute]),
    auditLayout.addChildren([auditRoute]),
    reportsLayout.addChildren([caseStatisticsRoute, complianceReportRoute, litigationCostsRoute]),
    adminLayout.addChildren([
      userManagementRoute,
      rolesPermissionsRoute,
      groupsRoute,
      formsTemplatesRoute,
      workflowConfigRoute,
      systemSettingsRoute,
    ]),
  ]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}
