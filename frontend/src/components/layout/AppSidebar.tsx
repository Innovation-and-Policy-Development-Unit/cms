import { Link, useLocation } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard, FolderOpen, FileText, ShieldCheck, Scale,
  Kanban, ListChecks, BarChart3, Gavel, Users, FileEdit,
  Settings2, Settings, KeyRound, UsersRound, ClipboardCheck,
} from 'lucide-react'
import { casesAPI } from '@/api/ccms'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { usePermissions } from '@/hooks/use-permissions'

function SectionLabel({ label, collapsed }: { label: string; collapsed?: boolean }) {
  if (collapsed) return <div className="mx-auto my-2 h-px w-6 bg-sidebar-border" />
  return (
    <p className="px-3 pb-1.5 pt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/50">
      {label}
    </p>
  )
}

function NavItem({
  to, icon: Icon, label, exact = false, onNavigate, collapsed, badge,
}: {
  to: string
  icon: React.ElementType
  label: string
  exact?: boolean
  onNavigate?: () => void
  collapsed?: boolean
  badge?: number
}) {
  const location = useLocation()
  const active = exact ? location.pathname === to : location.pathname.startsWith(to)
  const showBadge = badge !== undefined && badge > 0
  return (
    <Link
      to={to}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={cn(
        'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
        collapsed && 'justify-center px-2',
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
      )}
    >
      <Icon className={cn(
        'h-[18px] w-[18px] shrink-0',
        active ? 'text-primary-foreground' : 'text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground'
      )} />
      {!collapsed && (
        <>
          <span className="leading-none flex-1">{label}</span>
          {showBadge && (
            <Badge
              variant={active ? 'secondary' : 'destructive'}
              className="h-5 min-w-5 justify-center px-1.5 text-[10px]"
            >
              {badge > 99 ? '99+' : badge}
            </Badge>
          )}
        </>
      )}
      {collapsed && showBadge && (
        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
      )}
    </Link>
  )
}

export default function AppSidebar({
  onNavigate,
  collapsed,
}: {
  onNavigate?: () => void
  collapsed?: boolean
}) {
  const p = usePermissions()

  const { data: pendingApproval } = useQuery({
    queryKey: ['cases', 'pending-approval-count'],
    queryFn: () =>
      casesAPI
        .list({ portal_approval_status: 'pending_manager', page_size: 1 })
        .then((r) => (r.data?.count ?? 0) as number),
    enabled: p.canApprovePortal,
    refetchInterval: 60_000,
  })

  return (
    <aside className="flex h-full w-full flex-col border-r bg-sidebar">
      {/* Brand */}
      <div className={cn(
        'flex h-16 items-center border-b border-sidebar-border',
        collapsed ? 'justify-center px-2' : 'px-5 gap-3'
      )}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary shadow-sm">
          <ShieldCheck className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-[15px] font-bold tracking-tight text-sidebar-foreground leading-none">CCMS</p>
            <p className="text-[10px] text-sidebar-foreground/45 leading-tight tracking-wide uppercase mt-0.5">OPSC · Vanuatu</p>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 py-2">
        <nav className={cn(collapsed ? 'px-2 space-y-0.5' : 'px-4 space-y-0.5')}>

          {/* ── Overview ── */}
          <SectionLabel label="Menu" collapsed={collapsed} />
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" exact onNavigate={onNavigate} collapsed={collapsed} />

          {/* ── Case Management ── */}
          <SectionLabel label="Case Management" collapsed={collapsed} />
          <NavItem to="/cases" icon={FolderOpen} label="Cases" onNavigate={onNavigate} collapsed={collapsed} />
          {p.canApprovePortal && (
            <NavItem
              to="/approvals"
              icon={ClipboardCheck}
              label="Approval queue"
              onNavigate={onNavigate}
              collapsed={collapsed}
              badge={pendingApproval}
            />
          )}

          {/* ── Workflows ── */}
          <SectionLabel label="Workflows" collapsed={collapsed} />
          {p.canSeeWorkflows && (
            <NavItem to="/workflows/active" icon={Kanban} label="Pipeline overview" onNavigate={onNavigate} collapsed={collapsed} />
          )}
          <NavItem to="/workflows/my-tasks" icon={ListChecks} label="My Tasks" onNavigate={onNavigate} collapsed={collapsed} />

          {/* ── Records ── */}
          <SectionLabel label="Records" collapsed={collapsed} />
          <NavItem to="/documents" icon={FileText} label="Documents" onNavigate={onNavigate} collapsed={collapsed} />
          {p.canSeeAuditTrail && (
            <NavItem to="/audit" icon={Scale} label="Audit Trail" onNavigate={onNavigate} collapsed={collapsed} />
          )}

          {/* ── Reports ── */}
          {p.canSeeReports && (
            <>
              <SectionLabel label="Reports" collapsed={collapsed} />
              <NavItem to="/reports/statistics" icon={BarChart3}   label="Case Statistics"   onNavigate={onNavigate} collapsed={collapsed} />
              <NavItem to="/reports/compliance" icon={ShieldCheck} label="Compliance Report" onNavigate={onNavigate} collapsed={collapsed} />
              <NavItem to="/reports/litigation" icon={Gavel}       label="Litigation & Costs" onNavigate={onNavigate} collapsed={collapsed} />
            </>
          )}

          {/* ── Administration (admin / superadmin only) ── */}
          {p.isAdmin && (
            <>
              <SectionLabel label="Administration" collapsed={collapsed} />
              <NavItem to="/admin/users"           icon={Users}      label="Users"              onNavigate={onNavigate} collapsed={collapsed} />
              <NavItem to="/admin/roles"           icon={KeyRound}   label="Roles & Permissions" onNavigate={onNavigate} collapsed={collapsed} />
              <NavItem to="/admin/groups"          icon={UsersRound} label="Groups"             onNavigate={onNavigate} collapsed={collapsed} />
              <NavItem to="/admin/workflow-config" icon={Settings2}  label="Workflow Config"    onNavigate={onNavigate} collapsed={collapsed} />
              <NavItem to="/admin/forms"           icon={FileEdit}   label="Forms & Templates"  onNavigate={onNavigate} collapsed={collapsed} />
              <NavItem to="/admin/settings"        icon={Settings}   label="System Settings"    onNavigate={onNavigate} collapsed={collapsed} />
            </>
          )}
        </nav>
      </ScrollArea>

      {/* Footer */}
      {!collapsed && (
        <div className="border-t border-sidebar-border px-5 py-3">
          <p className="text-[10px] text-sidebar-foreground/40 tracking-wide">CCMS v2.0</p>
        </div>
      )}
    </aside>
  )
}
