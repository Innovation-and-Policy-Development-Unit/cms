import { Info, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AdminReferenceBanner({
  title = 'Reference information',
  children,
  className,
}: {
  title?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex gap-3 rounded-lg border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950',
        'dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100',
        className,
      )}
    >
      <BookOpen className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="min-w-0 space-y-1">
        <p className="font-semibold flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5" />
          {title}
        </p>
        <div className="text-xs leading-relaxed opacity-90">{children}</div>
      </div>
    </div>
  )
}
