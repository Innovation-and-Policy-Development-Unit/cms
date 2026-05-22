import { ChevronDown, MoreHorizontal, Pencil, Plus, RotateCcw, Send, CheckCircle2 } from 'lucide-react'
import { usePermissions } from '@/hooks/use-permissions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface CaseDetailActionsProps {
  caseData: Record<string, unknown>
  isActive: boolean
  isClosed: boolean
  portalBusy: boolean
  onEdit: () => void
  onRecordDecision: () => void
  onSubmitForApproval: () => void
  onApprovePortal: () => void
  onRejectPortal: () => void
  onRetryScdms: () => void
  onCloseCase: () => void
  onReopenCase: () => void
}

export function CaseDetailActions({
  caseData: c,
  isActive,
  isClosed,
  portalBusy,
  onEdit,
  onRecordDecision,
  onSubmitForApproval,
  onApprovePortal,
  onRejectPortal,
  onRetryScdms,
  onCloseCase,
  onReopenCase,
}: CaseDetailActionsProps) {
  const p = usePermissions()
  const portalStatus = c.portal_approval_status as string | undefined

  const canSubmit =
    isActive &&
    (portalStatus === 'draft' || portalStatus === 'rejected') &&
    p.isComplianceSeniorPrincipal &&
    Boolean(c.portal_form_type_code)

  const canApproveReject =
    isActive && portalStatus === 'pending_manager' && p.canApprovePortal

  const canRetryScdms =
    isActive &&
    !c.cdp_submission_id &&
    p.canApprovePortal &&
    portalStatus === 'approved'

  const hasScdmsMenu =
    canSubmit || canApproveReject || canRetryScdms || Boolean(c.cdp_submission_id)

  const hasMoreMenu =
    (isActive && p.canRecordDecision) ||
    (isActive && p.canCloseCase) ||
    (isClosed && p.canReopenCase)

  if (!p.canEditMetadata && !hasScdmsMenu && !hasMoreMenu) {
    return c.cdp_submission_id ? (
      <Badge variant="info" className="font-mono text-xs">
        CDP: {c.cdp_submission_id as string}
      </Badge>
    ) : null
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {Boolean(c.cdp_submission_id) && (
        <Badge variant="info" className="font-mono text-xs">
          {String(c.cdp_submission_id)}
        </Badge>
      )}

      {p.canEditMetadata && (
        <Button size="sm" variant="outline" onClick={onEdit} className="gap-1.5">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
      )}

      {hasScdmsMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" disabled={portalBusy} className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              SCDMS
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Portal &amp; SCDMS</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {canSubmit && (
              <DropdownMenuItem onClick={onSubmitForApproval}>
                Submit for manager approval
              </DropdownMenuItem>
            )}
            {canApproveReject && (
              <>
                <DropdownMenuItem onClick={onApprovePortal} className="gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Approve for portal
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onRejectPortal}
                  className="text-destructive focus:text-destructive"
                >
                  Reject registration
                </DropdownMenuItem>
              </>
            )}
            {canRetryScdms && (
              <DropdownMenuItem onClick={onRetryScdms}>Retry sync to SCDMS</DropdownMenuItem>
            )}
            {Boolean(c.cdp_submission_id) && !canRetryScdms && (
              <DropdownMenuItem disabled>Linked in SCDMS</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {hasMoreMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">More actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Case actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {isActive && p.canRecordDecision && (
              <DropdownMenuItem onClick={onRecordDecision} className="gap-2">
                <Plus className="h-4 w-4" />
                Record decision
              </DropdownMenuItem>
            )}
            {isActive && p.canCloseCase && (
              <DropdownMenuItem
                onClick={onCloseCase}
                className="text-destructive focus:text-destructive"
              >
                Close case
              </DropdownMenuItem>
            )}
            {isClosed && p.canReopenCase && (
              <DropdownMenuItem onClick={onReopenCase} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Reopen case
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
