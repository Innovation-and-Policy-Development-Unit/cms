import { Badge } from '@/components/ui/badge'
import { SLA_VARIANT, formatSlaStatus } from '@/lib/case-labels'
import { cn } from '@/lib/utils'

export function SlaBadge({
  status,
  className,
  size = 'default',
}: {
  status: string | undefined | null
  className?: string
  size?: 'default' | 'sm'
}) {
  const label = formatSlaStatus(status)
  return (
    <Badge
      variant={SLA_VARIANT[status ?? ''] ?? 'secondary'}
      className={cn(
        'tabular-nums',
        size === 'sm' && 'text-[10px] px-1.5',
        className,
      )}
      title={label}
    >
      {label}
    </Badge>
  )
}
