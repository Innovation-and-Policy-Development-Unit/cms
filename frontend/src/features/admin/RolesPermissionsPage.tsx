import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Users, ChevronDown, ChevronRight, Check, X, UserPlus, Trash2 } from 'lucide-react'
import { usersAPI } from '@/api/ccms'
import { ROLE_LABELS, can, type Permission } from '@/lib/permissions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

/* ─── Permission display map ─────────────────────────────────────────────── */
const PERMISSION_GROUPS: { group: string; items: { key: Permission; label: string }[] }[] = [
  {
    group: 'Cases',
    items: [
      { key: 'createCase',      label: 'Create Case' },
      { key: 'editCaseMetadata',label: 'Edit Case Metadata' },
      { key: 'fullCaseList',    label: 'View All Cases (unfiltered)' },
      { key: 'closeCase',       label: 'Close Case' },
      { key: 'reopenCase',      label: 'Reopen Case' },
    ],
  },
  {
    group: 'Workflow & Tasks',
    items: [
      { key: 'activeWorkflows', label: 'View Active Workflows' },
      { key: 'completeStage',   label: 'Complete Stage / Task' },
      { key: 'createTask',      label: 'Create / Assign Tasks' },
    ],
  },
  {
    group: 'Decisions & Documents',
    items: [
      { key: 'recordDecision',  label: 'Record Decision' },
      { key: 'decisionsTab',    label: 'View Decisions Tab' },
      { key: 'litigationTab',   label: 'View Litigation Tab' },
      { key: 'uploadDocs',      label: 'Upload Documents' },
      { key: 'deleteDocs',      label: 'Delete Documents' },
    ],
  },
  {
    group: 'Audit & Reports',
    items: [
      { key: 'auditTrail',      label: 'Global Audit Trail' },
      { key: 'caseAuditTab',    label: 'Case Audit Log Tab' },
      { key: 'reportsAccess',   label: 'Reports Section' },
      { key: 'exportReports',   label: 'Export Reports' },
      { key: 'internalNotes',   label: 'Internal Notes (Private)' },
    ],
  },
  {
    group: 'Administration',
    items: [
      { key: 'adminSection',    label: 'Admin Section (Users, Config)' },
    ],
  },
]

const ALL_ROLES = Object.keys(ROLE_LABELS)

const ROLE_BADGE: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  superadmin: 'destructive', admin: 'destructive',
  compliance_unit: 'default', secretary_opsc: 'default',
  commission_member: 'secondary', dg_director: 'secondary',
  mdc_panel_mediator: 'outline', employee_subject: 'outline',
}

type UserRow = Record<string, unknown>

/* ─── Assign Role Dialog ─────────────────────────────────────────────────── */
function AssignRoleDialog({ open, onOpenChange, targetRole, existingUserIds }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  targetRole: string
  existingUserIds: Set<number>
}) {
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')

  const { data } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersAPI.list().then((r) => r.data),
  })
  const allUsers: UserRow[] = data?.results ?? data ?? []
  const available = allUsers.filter((u) => !existingUserIds.has(u.id as number))

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUserId) return
    setSaving(true)
    try {
      await usersAPI.update(Number(selectedUserId), { role: targetRole })
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('Role assigned.')
      onOpenChange(false)
      setSelectedUserId('')
    } catch { toast.error('Failed to assign role.') }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Assign to {ROLE_LABELS[targetRole]}</DialogTitle>
          <p className="text-sm text-muted-foreground pt-1">Select a user to assign this role to.</p>
        </DialogHeader>
        <form onSubmit={handleAssign} className="space-y-4">
          <div className="space-y-1.5">
            <Label>User *</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId} required>
              <SelectTrigger><SelectValue placeholder="Select a user" /></SelectTrigger>
              <SelectContent>
                {available.length === 0
                  ? <div className="px-3 py-4 text-sm text-center text-muted-foreground">All users already have this role</div>
                  : available.map((u) => (
                    <SelectItem key={u.id as number} value={String(u.id)}>
                      {u.first_name as string} {u.last_name as string} ({u.username as string})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !selectedUserId}>{saving ? 'Assigning…' : 'Assign Role'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Role Card ──────────────────────────────────────────────────────────── */
function RoleCard({ role, users, isLoading }: {
  role: string; users: UserRow[]; isLoading: boolean
}) {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const existingIds = new Set(users.map((u) => u.id as number))

  const handleRemoveRole = async (u: UserRow) => {
    if (!confirm(`Remove ${ROLE_LABELS[role]} role from ${u.first_name} ${u.last_name}? They will be reassigned to 'Employee / Subject'.`)) return
    try {
      await usersAPI.update(u.id as number, { role: 'employee_subject' })
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('Role removed.')
    } catch { toast.error('Failed to remove role.') }
  }

  return (
    <Card>
      <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => setExpanded((v) => !v)}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <div>
              <CardTitle className="text-base">{ROLE_LABELS[role]}</CardTitle>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{role}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={ROLE_BADGE[role] ?? 'outline'} className="gap-1.5">
              <Users className="h-3 w-3" /> {users.length}
            </Badge>
            <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={(e) => { e.stopPropagation(); setAssigning(true) }}>
              <UserPlus className="h-3.5 w-3.5" /> Assign
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Permission matrix for this role */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Permissions</p>
            {PERMISSION_GROUPS.map(({ group, items }) => (
              <div key={group}>
                <p className="text-xs font-medium mb-1.5 text-foreground/70">{group}</p>
                <div className="grid gap-1 sm:grid-cols-2">
                  {items.map(({ key, label }) => {
                    const allowed = can(role, key)
                    return (
                      <div key={key} className={`flex items-center gap-2 text-xs rounded px-2 py-1 ${
                        allowed ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'
                      }`}>
                        {allowed
                          ? <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          : <X className="h-3.5 w-3.5 shrink-0 opacity-30" />}
                        {label}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Users in this role */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Users with this role ({users.length})
            </p>
            {isLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : users.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center">No users assigned to this role.</p>
            ) : (
              <div className="divide-y rounded-lg border">
                {users.map((u) => (
                  <div key={u.id as number} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                        {((u.first_name as string)?.[0] ?? '?').toUpperCase()}{((u.last_name as string)?.[0] ?? '').toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-none">{u.first_name as string} {u.last_name as string}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{u.username as string}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={u.is_active ? 'success' : 'secondary'} className="text-[10px]">
                        {u.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {role !== 'superadmin' && (
                        <Button size="sm" variant="ghost" title="Remove role" onClick={() => handleRemoveRole(u)}>
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      )}

      <AssignRoleDialog
        open={assigning}
        onOpenChange={setAssigning}
        targetRole={role}
        existingUserIds={existingIds}
      />
    </Card>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function RolesPermissionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersAPI.list().then((r) => r.data),
  })
  const allUsers: UserRow[] = data?.results ?? data ?? []

  const usersByRole = ALL_ROLES.reduce<Record<string, UserRow[]>>((acc, role) => {
    acc[role] = allUsers.filter((u) => u.role === role)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Roles &amp; Permissions</h1>
        <p className="text-sm text-muted-foreground">
          View what each role can do and manage which users belong to each role.
        </p>
      </div>

      {/* Summary row */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Users',  value: allUsers.length },
          { label: 'Active',       value: allUsers.filter((u) => u.is_active).length },
          { label: 'Inactive',     value: allUsers.filter((u) => !u.is_active).length },
          { label: 'Roles Defined',value: ALL_ROLES.length },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-3xl font-bold">{isLoading ? '—' : value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Role cards */}
      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
          : ALL_ROLES.map((role) => (
            <RoleCard key={role} role={role} users={usersByRole[role] ?? []} isLoading={isLoading} />
          ))}
      </div>
    </div>
  )
}
