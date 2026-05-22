/** Scope banners — must stay aligned with backend apps.cases.scoping */

export const CASE_SCOPE_BANNERS: Partial<
  Record<string, { color: string; text: string }>
> = {
  commission_member: {
    color:
      'bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/20 dark:border-violet-800 dark:text-violet-300',
    text: 'Showing senior executive cases with a Commission stage in progress or completed.',
  },
  dg_director: {
    color:
      'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-300',
    text: 'Showing cases where the subject ministry matches your profile department.',
  },
  mdc_panel_mediator: {
    color:
      'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-300',
    text: 'Showing cases where you are the case or stage assignee.',
  },
  employee_subject: {
    color:
      'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-300',
    text: 'Showing cases where the subject name matches your account name.',
  },
}
