import type { LucideIcon } from 'lucide-react'
import { TableCell, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

export function EmptyState({
  title,
  description,
  icon: Icon,
  className,
  children,
}: {
  title: string
  description?: string
  icon?: LucideIcon
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-16 px-4 text-center',
        className,
      )}
    >
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Icon className="h-6 w-6 text-muted-foreground" aria-hidden />
        </div>
      )}
      <div className="space-y-1">
        <p className="font-medium text-foreground">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground max-w-md">{description}</p>
        )}
      </div>
      {children ? (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
          {children}
        </div>
      ) : null}
    </div>
  )
}

/** Centered empty block inside a table row */
export function TableEmptyState({
  colSpan,
  title,
  description,
  icon,
  children,
}: {
  colSpan: number
  title: string
  description?: string
  icon?: LucideIcon
  children?: React.ReactNode
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="p-0">
        <EmptyState title={title} description={description} icon={icon}>
          {children}
        </EmptyState>
      </TableCell>
    </TableRow>
  )
}
