import { z } from 'zod'

export const CASE_DETAIL_TABS = [
  'overview',
  'stages',
  'documents',
  'decisions',
  'litigation',
  'audit',
  'notes',
] as const

export type CaseDetailTab = (typeof CASE_DETAIL_TABS)[number]

export const CASE_DETAIL_TAB_LABEL: Record<CaseDetailTab, string> = {
  overview: 'Overview',
  stages: 'Tasks / Stages',
  documents: 'Documents',
  decisions: 'Decisions',
  litigation: 'Litigation',
  audit: 'Audit Log',
  notes: 'Internal Notes',
}

export const caseDetailSearchSchema = z.object({
  tab: z.enum(CASE_DETAIL_TABS).catch('overview').default('overview'),
})

export type CaseDetailSearch = z.infer<typeof caseDetailSearchSchema>
