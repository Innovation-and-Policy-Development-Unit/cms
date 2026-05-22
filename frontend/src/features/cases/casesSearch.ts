import { z } from 'zod'

export const casesSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1).default(1),
  page_size: z.coerce.number().int().min(10).max(100).catch(20).default(20),
  q: z.string().catch('').default(''),
  case_family: z.string().catch('').default(''),
  status: z.string().catch('').default(''),
  ministry: z.string().catch('').default(''),
  portal_approval_status: z.string().catch('').default(''),
})

export type CasesSearch = z.infer<typeof casesSearchSchema>

export function casesSearchHasFilters(search: CasesSearch): boolean {
  return !!(
    search.q ||
    search.case_family ||
    search.status ||
    search.ministry ||
    search.portal_approval_status
  )
}
