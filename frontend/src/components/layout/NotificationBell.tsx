import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, AlertTriangle, ClipboardList, Gavel, Info } from 'lucide-react'
import { notificationsAPI } from '@/api/ccms'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

export interface NotificationRow {
  id: number
  notif_type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
  related_case_id: number | null
}

const TYPE_ICON: Record<string, React.ElementType> = {
  sla_warning: AlertTriangle,
  stage_assigned: ClipboardList,
  case_closed: CheckCheck,
  decision_added: Gavel,
  general: Info,
}

function formatWhen(iso: string) {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return 'Just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return d.toLocaleDateString()
}

export default function NotificationBell() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)

  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread_count'],
    queryFn: () => notificationsAPI.unreadCount().then((r) => r.data as { count: number }),
    refetchInterval: 60_000,
  })

  const unread = unreadData?.count ?? 0

  const { data: listData, isLoading } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () =>
      notificationsAPI.list().then((r) => {
        const rows = (r.data?.results ?? r.data ?? []) as NotificationRow[]
        return rows.slice(0, 20)
      }),
    enabled: open,
  })

  const markRead = useMutation({
    mutationFn: (id: number) => notificationsAPI.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAllRead = useMutation({
    mutationFn: () => notificationsAPI.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const handleOpenItem = (n: NotificationRow) => {
    if (!n.is_read) markRead.mutate(n.id)
    setOpen(false)
    if (n.related_case_id) {
      navigate({ to: '/cases/$id', params: { id: String(n.related_case_id) } })
    }
  }

  const notifications = listData ?? []

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground ring-2 ring-card">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              disabled={markAllRead.isPending}
              onClick={(e) => {
                e.preventDefault()
                markAllRead.mutate()
              }}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[min(320px,50vh)]">
          {isLoading ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : notifications.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => {
                const Icon = TYPE_ICON[n.notif_type] ?? Info
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleOpenItem(n)}
                      className={cn(
                        'flex w-full gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/80',
                        !n.is_read && 'bg-primary/5',
                      )}
                    >
                      <div
                        className={cn(
                          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                          n.is_read ? 'bg-muted' : 'bg-primary/10',
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-4 w-4',
                            n.is_read ? 'text-muted-foreground' : 'text-primary',
                          )}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-sm leading-snug', !n.is_read && 'font-semibold')}>
                          {n.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {n.message}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {formatWhen(n.created_at)}
                          {n.related_case_id ? ' · View case' : ''}
                        </p>
                      </div>
                      {!n.is_read && (
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
