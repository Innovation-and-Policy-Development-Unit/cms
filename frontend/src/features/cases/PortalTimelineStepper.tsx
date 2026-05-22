import { CheckCircle2, Circle, XCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type StepStatus = 'done' | 'current' | 'upcoming' | 'rejected'

interface TimelineStep {
  id: string
  label: string
  status: StepStatus
  at?: string | null
  actor?: string | null
  detail?: string | null
}

function formatUser(detail: Record<string, string> | undefined | null): string | null {
  if (!detail) return null
  const name = `${detail.first_name ?? ''} ${detail.last_name ?? ''}`.trim()
  return name || detail.username || null
}

function formatTs(iso: string | null | undefined): string | null {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

function buildPortalSteps(c: Record<string, unknown>): TimelineStep[] {
  const portalStatus = (c.portal_approval_status as string) || 'draft'
  const caseStatus = c.status as string
  const inScdms = Boolean(c.cdp_submission_id) || portalStatus === 'sent_to_portal'
  const isClosed = caseStatus === 'closed'
  const isRejected = portalStatus === 'rejected'

  const initiator = formatUser(c.initiating_officer_detail as Record<string, string>)
  const approver = formatUser(c.portal_approved_by_detail as Record<string, string>)

  let currentIdx = 0
  if (isClosed) currentIdx = 4
  else if (isRejected) currentIdx = 2
  else if (inScdms) currentIdx = 3
  else if (portalStatus === 'approved') currentIdx = 2
  else if (portalStatus === 'pending_manager') currentIdx = 1
  else if (portalStatus === 'sent_to_portal') currentIdx = 3

  const stepMeta: Omit<TimelineStep, 'status'>[] = [
    {
      id: 'draft',
      label: 'Draft',
      at: formatTs(c.date_opened as string),
      actor: initiator,
      detail: c.portal_form_type_code
        ? `Form ${c.portal_form_type_code as string}`
        : null,
    },
    {
      id: 'pending_manager',
      label: 'Pending manager',
      at: null,
      actor: null,
      detail:
        portalStatus === 'pending_manager'
          ? 'Awaiting Compliance Manager approval'
          : null,
    },
    {
      id: 'approved',
      label: isRejected ? 'Rejected' : 'Approved',
      at: formatTs(c.portal_approved_at as string),
      actor: approver,
      detail: isRejected ? (c.portal_approval_notes as string) || 'Returned to compliance' : 'Approved for SCDMS registration',
    },
    {
      id: 'in_scdms',
      label: 'In SCDMS',
      at: formatTs(c.portal_sent_at as string),
      actor: inScdms ? 'SCDMS' : null,
      detail: c.cdp_submission_id
        ? `Submission ${c.cdp_submission_id as string}`
        : 'Not yet linked',
    },
    {
      id: 'closed_cms',
      label: 'Closed (CMS)',
      at: formatTs(c.date_closed as string),
      actor: 'CMS',
      detail: isClosed ? 'Case closed in CMS' : 'Active in CMS',
    },
  ]

  return stepMeta.map((step, i) => {
    let status: StepStatus = 'upcoming'
    if (isRejected && step.id === 'approved') status = 'rejected'
    else if (i < currentIdx) status = 'done'
    else if (i === currentIdx) status = 'current'
    else if (step.id === 'in_scdms' && inScdms && i > currentIdx && !isClosed) status = 'done'
    else if (step.id === 'closed_cms' && isClosed) status = 'done'

    if (isRejected && (step.id === 'in_scdms' || step.id === 'closed_cms') && !isClosed) {
      status = 'upcoming'
    }
    if (isRejected && step.id === 'pending_manager') status = 'done'

    return { ...step, status }
  })
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === 'done') return <CheckCircle2 className="h-5 w-5 text-emerald-600" />
  if (status === 'current') return <Loader2 className="h-5 w-5 text-primary animate-spin" />
  if (status === 'rejected') return <XCircle className="h-5 w-5 text-destructive" />
  return <Circle className="h-5 w-5 text-muted-foreground/40" />
}

export function PortalTimelineStepper({ caseData }: { caseData: Record<string, unknown> }) {
  const steps = buildPortalSteps(caseData)

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max items-start gap-0">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1
          const lineDone = step.status === 'done' || step.status === 'rejected'
          return (
            <div key={step.id} className="flex items-start">
              <div className="flex flex-col items-center w-36 sm:w-40">
                <StepIcon status={step.status} />
                <p
                  className={cn(
                    'mt-2 text-center text-[11px] font-semibold leading-tight',
                    step.status === 'current' && 'text-primary',
                    step.status === 'done' && 'text-emerald-700 dark:text-emerald-400',
                    step.status === 'rejected' && 'text-destructive',
                    step.status === 'upcoming' && 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </p>
                {step.at && (
                  <p className="mt-1 text-center text-[10px] text-muted-foreground">{step.at}</p>
                )}
                {step.actor && (
                  <p className="mt-0.5 text-center text-[10px] text-muted-foreground truncate max-w-[9rem]">
                    {step.actor}
                  </p>
                )}
                {step.detail && step.status !== 'upcoming' && (
                  <p className="mt-1 text-center text-[9px] text-muted-foreground/80 line-clamp-2 px-1">
                    {step.detail}
                  </p>
                )}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'mt-2.5 h-0.5 w-6 sm:w-10 shrink-0',
                    lineDone ? 'bg-emerald-500' : 'bg-border',
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
