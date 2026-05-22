import { useState, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { LogOut, User, PanelLeft, Search } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { authAPI } from '@/api/ccms'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import CommandPalette, { useCommandPaletteShortcut } from '@/components/layout/CommandPalette'
import NotificationBell from '@/components/layout/NotificationBell'

interface AppHeaderProps {
  onToggle: () => void
}

export default function AppHeader({ onToggle }: AppHeaderProps) {
  const navigate = useNavigate()
  const { user, refreshToken, logout } = useAuthStore()
  const [commandOpen, setCommandOpen] = useState(false)

  const openCommand = useCallback(() => setCommandOpen(true), [])
  useCommandPaletteShortcut(openCommand)

  const handleLogout = async () => {
    try {
      if (refreshToken) await authAPI.logout(refreshToken)
    } finally {
      logout()
      navigate({ to: '/login' })
    }
  }

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() || user.username[0].toUpperCase()
    : '?'

  const displayName = user
    ? `${user.first_name} ${user.last_name}`.trim() || user.username
    : ''

  const modKey =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.userAgent)
      ? '⌘'
      : 'Ctrl+'

  return (
    <>
      <header className="flex h-16 items-center justify-between gap-4 border-b bg-card px-5 shadow-sm">
        <Button variant="ghost" size="icon" onClick={onToggle} aria-label="Toggle sidebar" className="shrink-0">
          <PanelLeft className="h-5 w-5" />
        </Button>

        <button
          type="button"
          onClick={openCommand}
          className="flex flex-1 max-w-md items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Open command palette"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 hidden sm:block text-left">Search or type command…</span>
          <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border bg-background px-1.5 text-[10px] font-medium text-muted-foreground">
            {modKey}K
          </kbd>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex h-auto items-center gap-2 rounded-full px-2 py-1">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:block text-sm font-medium max-w-[120px] truncate">
                  {displayName}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{displayName}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                  <p className="text-xs leading-none text-muted-foreground capitalize mt-0.5">
                    {user?.role?.replace(/_/g, ' ')}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate({ to: '/profile' })}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  )
}
