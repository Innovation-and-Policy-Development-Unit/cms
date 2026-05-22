import { createRoute } from '@tanstack/react-router'
import { casesSearchSchema } from '@/features/cases/casesSearch'
import { caseDetailSearchSchema } from '@/features/cases/caseDetailSearch'
import CaseListPage from '@/features/cases/CaseListPage'
import CaseDetailPage from '@/features/cases/CaseDetailPage'
import type { AnyRoute } from '@tanstack/react-router'

/** Register case routes under the authenticated layout. */
export function createCaseRoutes(authLayout: AnyRoute) {
  const casesRoute = createRoute({
    getParentRoute: () => authLayout,
    path: '/cases',
    component: CaseListPage,
    validateSearch: casesSearchSchema,
  })

  const caseDetailRoute = createRoute({
    getParentRoute: () => authLayout,
    path: '/cases/$id',
    component: CaseDetailPage,
    validateSearch: caseDetailSearchSchema,
  })

  return { casesRoute, caseDetailRoute }
}
