import { useRouterState } from '@tanstack/react-router'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { breadcrumbsForPath } from '@/lib/route-breadcrumbs'

/** Shown in AppLayout for admin / reports / workflow routes (not case list/detail). */
export function AppRouteBreadcrumbs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const items = breadcrumbsForPath(pathname)
  if (!items?.length) return null
  return <Breadcrumbs items={items} className="mb-4" />
}
