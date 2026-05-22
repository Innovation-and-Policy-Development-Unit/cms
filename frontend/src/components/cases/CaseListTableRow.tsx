import { useNavigate } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { TableCell, TableRow } from '@/components/ui/table'
import { SlaBadge } from '@/components/ui/sla-badge'
import {
  FAMILY_LABEL,
  PORTAL_APPROVAL_LABEL,
  STATUS_VARIANT,
} from '@/lib/case-labels'

export function CaseListTableRow({ c }: { c: Record<string, unknown> }) {
  const navigate = useNavigate()

  const open = () =>
    navigate({ to: '/cases/$id', params: { id: String(c.id) } })

  return (
    <TableRow
      tabIndex={0}
      role="link"
      className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          open()
        }
      }}
    >
      <TableCell className="font-mono text-sm font-semibold text-primary whitespace-nowrap">
        {c.reference_number as string}
      </TableCell>
      <TableCell className="font-medium">{c.subject_name as string}</TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {(c.subject_ministry as string) || '—'}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs whitespace-nowrap">
          {FAMILY_LABEL[c.case_family as string] ?? (c.case_family as string)}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={STATUS_VARIANT[c.status as string] ?? 'outline'}>
          {(c.status as string)?.replace('_', ' ')}
        </Badge>
      </TableCell>
      <TableCell className="text-xs">
        {(c.portal_form_type_code as string) && (
          <span className="font-mono block">{c.portal_form_type_code as string}</span>
        )}
        {(c.portal_approval_status as string) ? (
          <Badge variant="outline" className="text-[10px] mt-0.5">
            {PORTAL_APPROVAL_LABEL[c.portal_approval_status as string] ??
              (c.portal_approval_status as string).replace(/_/g, ' ')}
          </Badge>
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell>
        <SlaBadge status={c.overall_sla_status as string} />
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {(c.active_stage as Record<string, string>)?.name ?? '—'}
      </TableCell>
      <TableCell className="text-xs">
        {(c.assigned_officer_name as string) ?? '—'}
      </TableCell>
      <TableCell className="text-xs whitespace-nowrap">
        {c.date_received as string}
      </TableCell>
    </TableRow>
  )
}
