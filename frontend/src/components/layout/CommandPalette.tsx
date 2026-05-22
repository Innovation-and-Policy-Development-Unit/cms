import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Search, LayoutDashboard, FolderOpen, ListChecks, FileText, User,
  Plus, Shield, BarChart3, Scale, Users,
} from 'lucide-react'
import { casesAPI, usersAPI } from '@/api/ccms'
import { usePermissions } from '@/hooks/use-permissions'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type CommandItem = {
  id: string
  label: string
  hint?: string
  icon: React.ElementType
  run: () => void
}

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

function CommandGroup({
  heading,
  items,
  activeId,
  onActive,
}: {
  heading: string
  items: CommandItem[]
  activeId: string | null
  onActive: (id: string) => void
}) {
  if (items.length === 0) return null
  return (
    <div className="py-1">
      <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {heading}
      </p>
      <ul role="listbox" aria-label={heading}>
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              role="option"
              aria-selected={activeId === item.id}
              onMouseEnter={() => onActive(item.id)}
              onClick={item.run}
              className={cn(
                'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors',
                activeId === item.id ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/80',
              )}
            >
              <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate font-medium">{item.label}</span>
              {item.hint && (
                <span className="truncate text-xs text-muted-foreground max-w-[40%]">{item.hint}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate()
  const p = usePermissions()
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const debouncedQuery = useDebouncedValue(query.trim(), 280)

  const go = useCallback(
    (to: string) => {
      onOpenChange(false)
      setQuery('')
      navigate({ to })
    },
    [navigate, onOpenChange],
  )

  const staticItems = useMemo((): CommandItem[] => {
    const items: CommandItem[] = [
      { id: 'nav-dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, run: () => go('/dashboard') },
      { id: 'nav-cases', label: 'Go to Cases', icon: FolderOpen, run: () => go('/cases') },
      { id: 'nav-tasks', label: 'Go to My Tasks', icon: ListChecks, run: () => go('/workflows/my-tasks') },
      { id: 'nav-documents', label: 'Go to Documents', icon: FileText, run: () => go('/documents') },
      { id: 'nav-profile', label: 'Go to Profile', icon: User, run: () => go('/profile') },
    ]
    if (p.canCreateCase) {
      items.unshift({
        id: 'action-new-case',
        label: 'Create new case',
        hint: 'Opens Cases',
        icon: Plus,
        run: () => go('/cases'),
      })
    }
    if (p.canApprovePortal) {
      items.push({
        id: 'nav-approvals',
        label: 'Cases — pending manager approval',
        icon: Shield,
        run: () => go('/cases'),
      })
    }
    if (p.canSeeAuditTrail) {
      items.push({ id: 'nav-audit', label: 'Go to Audit Trail', icon: Scale, run: () => go('/audit') })
    }
    if (p.canSeeReports) {
      items.push({
        id: 'nav-reports',
        label: 'Go to Case Statistics',
        icon: BarChart3,
        run: () => go('/reports/statistics'),
      })
    }
    if (p.isAdmin) {
      items.push({
        id: 'nav-users',
        label: 'Go to User Management',
        icon: Users,
        run: () => go('/admin/users'),
      })
    }
    const q = debouncedQuery.toLowerCase()
    if (!q) return items
    return items.filter((i) => i.label.toLowerCase().includes(q))
  }, [debouncedQuery, go, p])

  const { data: caseResults, isFetching: casesLoading } = useQuery({
    queryKey: ['command-palette', 'cases', debouncedQuery],
    queryFn: () =>
      casesAPI
        .list({ search: debouncedQuery, page_size: 8 })
        .then((r) => (r.data?.results ?? r.data ?? []) as Record<string, unknown>[]),
    enabled: open && debouncedQuery.length >= 2,
  })

  const { data: userResults, isFetching: usersLoading } = useQuery({
    queryKey: ['command-palette', 'users', debouncedQuery],
    queryFn: () =>
      usersAPI
        .list({ search: debouncedQuery, page_size: 6 })
        .then((r) => (r.data?.results ?? r.data ?? []) as Record<string, unknown>[]),
    enabled: open && p.isAdmin && debouncedQuery.length >= 2,
  })

  const caseItems = useMemo((): CommandItem[] => {
    if (!caseResults?.length) return []
    return caseResults.map((c) => ({
      id: `case-${c.id}`,
      label: String(c.reference_number ?? c.id),
      hint: String(c.subject_name ?? ''),
      icon: FolderOpen,
      run: () => go(`/cases/${c.id}`),
    }))
  }, [caseResults, go])

  const userItems = useMemo((): CommandItem[] => {
    if (!userResults?.length) return []
    return userResults.map((u) => ({
      id: `user-${u.id}`,
      label: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || String(u.username),
      hint: String(u.username),
      icon: User,
      run: () => go('/admin/users'),
    }))
  }, [userResults, go])

  const allItems = useMemo(
    () => [...staticItems, ...caseItems, ...userItems],
    [staticItems, caseItems, userItems],
  )

  useEffect(() => {
    if (!open) {
      setQuery('')
      setActiveId(null)
      return
    }
    setActiveId(allItems[0]?.id ?? null)
  }, [open, debouncedQuery])

  useEffect(() => {
    if (allItems.length && activeId && !allItems.some((i) => i.id === activeId)) {
      setActiveId(allItems[0]?.id ?? null)
    }
  }, [allItems, activeId])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const idx = allItems.findIndex((i) => i.id === activeId)
      const next = allItems[Math.min(idx + 1, allItems.length - 1)]
      if (next) setActiveId(next.id)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const idx = allItems.findIndex((i) => i.id === activeId)
      const prev = allItems[Math.max(idx - 1, 0)]
      if (prev) setActiveId(prev.id)
    } else if (e.key === 'Enter' && activeId) {
      e.preventDefault()
      allItems.find((i) => i.id === activeId)?.run()
    }
  }

  const searching = debouncedQuery.length >= 2 && (casesLoading || usersLoading)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>Command palette</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search cases, users, or jump to a page…"
            className="border-0 shadow-none focus-visible:ring-0 h-12"
            autoFocus
          />
        </div>
        <div className="max-h-[min(360px,50vh)] overflow-y-auto py-1">
          <CommandGroup
            heading="Quick actions"
            items={staticItems}
            activeId={activeId}
            onActive={setActiveId}
          />
          {debouncedQuery.length >= 2 && (
            <>
              <CommandGroup
                heading={searching ? 'Cases (searching…)' : 'Cases'}
                items={caseItems}
                activeId={activeId}
                onActive={setActiveId}
              />
              {p.isAdmin && (
                <CommandGroup
                  heading={searching ? 'Users (searching…)' : 'Users'}
                  items={userItems}
                  activeId={activeId}
                  onActive={setActiveId}
                />
              )}
              {!searching && caseItems.length === 0 && userItems.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No cases or users matching &ldquo;{debouncedQuery}&rdquo;
                </p>
              )}
            </>
          )}
          {debouncedQuery.length > 0 && debouncedQuery.length < 2 && (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">
              Type at least 2 characters to search cases{p.isAdmin ? ' and users' : ''}.
            </p>
          )}
        </div>
        <div className="border-t px-3 py-2 text-[10px] text-muted-foreground flex gap-3">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> open</span>
          <span><kbd className="font-mono">esc</kbd> close</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Global ⌘K / Ctrl+K listener — mount once in AppLayout */
export function useCommandPaletteShortcut(onOpen: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onOpen()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onOpen])
}
