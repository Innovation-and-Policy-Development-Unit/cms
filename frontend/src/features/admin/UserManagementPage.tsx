import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Search, Pencil, Trash2, KeyRound, UserCheck, UserX, Shield } from 'lucide-react'
import { usersAPI } from '@/api/ccms'
import { ROLE_LABELS } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

/* ─── Constants ──────────────────────────────────────────────────────────── */
const ROLES = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))

const ROLE_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  superadmin:         'destructive',
  admin:              'destructive',
  compliance_unit:    'default',
  secretary_opsc:     'default',
  commission_member:  'secondary',
  dg_director:        'secondary',
  mdc_panel_mediator: 'outline',
  employee_subject:   'outline',
}

type UserRow = Record<string, unknown>

/* ─── Create / Edit User Dialog ──────────────────────────────────────────── */
function UserDialog({ open, onOpenChange, editing }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: UserRow | null
}) {
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)
  const isEdit = !!editing

  const [form, setForm] = useState(() => editing
    ? { username: editing.username as string, email: (editing.email as string) ?? '',
        first_name: (editing.first_name as string) ?? '', last_name: (editing.last_name as string) ?? '',
        role: (editing.role as string) ?? '', is_active: (editing.is_active as boolean) ?? true,
        password: '', confirm_password: '' }
    : { username: '', email: '', first_name: '', last_name: '', role: '', is_active: true, password: '', confirm_password: '' }
  )

  const set = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEdit && form.password !== form.confirm_password) { toast.error('Passwords do not match.'); return }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        username: form.username, email: form.email,
        first_name: form.first_name, last_name: form.last_name,
        role: form.role, is_active: form.is_active,
      }
      if (!isEdit && form.password) payload.password = form.password
      if (isEdit) { await usersAPI.update(editing!.id as number, payload); toast.success('User updated.') }
      else        { await usersAPI.create(payload);                         toast.success('User created.') }
      qc.invalidateQueries({ queryKey: ['users'] })
      onOpenChange(false)
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } })?.response?.data
      if (data && typeof data === 'object') {
        const msg = Object.entries(data as Record<string, unknown>)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
        toast.error(msg)
      } else { toast.error('Failed to save user.') }
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isEdit ? 'Edit User' : 'Create New User'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>First Name *</Label>
              <Input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name *</Label>
              <Input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Username *</Label>
            <Input value={form.username} onChange={(e) => set('username', e.target.value)} required autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Role *</Label>
            <Select value={form.role} onValueChange={(v) => set('role', v)} required>
              <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {!isEdit && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Password *</Label>
                <Input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} required autoComplete="new-password" />
              </div>
              <div className="space-y-1.5">
                <Label>Confirm Password *</Label>
                <Input type="password" value={form.confirm_password} onChange={(e) => set('confirm_password', e.target.value)} required />
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
            <Switch checked={form.is_active} onCheckedChange={(v) => set('is_active', v)} id="is_active" />
            <Label htmlFor="is_active" className="font-normal cursor-pointer">Account Active — user can log in</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create User'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Reset Password Dialog ──────────────────────────────────────────────── */
function ResetPasswordDialog({ open, onOpenChange, user }: {
  open: boolean; onOpenChange: (v: boolean) => void; user: UserRow | null
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ new_password: '', confirm_password: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.new_password !== form.confirm_password) { toast.error('Passwords do not match.'); return }
    setSaving(true)
    try {
      await usersAPI.resetPassword(user!.id as number, form)
      toast.success('Password reset successfully.')
      onOpenChange(false)
      setForm({ new_password: '', confirm_password: '' })
    } catch { toast.error('Failed to reset password.') }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <p className="text-sm text-muted-foreground pt-1">
            Setting a new password for <strong>{user?.first_name as string} {user?.last_name as string}</strong>
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>New Password *</Label>
            <Input type="password" value={form.new_password} onChange={(e) => setForm((p) => ({ ...p, new_password: e.target.value }))} required autoComplete="new-password" />
          </div>
          <div className="space-y-1.5">
            <Label>Confirm New Password *</Label>
            <Input type="password" value={form.confirm_password} onChange={(e) => setForm((p) => ({ ...p, confirm_password: e.target.value }))} required />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Resetting…' : 'Reset Password'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function UserManagementPage() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [roleFilter, setRoleFilter]     = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [creating, setCreating]         = useState(false)
  const [editing, setEditing]           = useState<UserRow | null>(null)
  const [resetting, setResetting]       = useState<UserRow | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn:  () => usersAPI.list().then((r) => r.data),
  })

  const allUsers: UserRow[] = data?.results ?? data ?? []

  const users = allUsers.filter((u) => {
    const matchQ      = !q            || `${u.first_name} ${u.last_name} ${u.username} ${u.email}`.toLowerCase().includes(q.toLowerCase())
    const matchRole   = !roleFilter   || u.role === roleFilter
    const matchStatus = !statusFilter || String(u.is_active) === statusFilter
    return matchQ && matchRole && matchStatus
  })

  const handleToggleActive = async (u: UserRow) => {
    try {
      if (u.is_active) { await usersAPI.deactivate(u.id as number); toast.success(`${u.first_name} ${u.last_name} deactivated.`) }
      else             { await usersAPI.activate(u.id as number);   toast.success(`${u.first_name} ${u.last_name} activated.`) }
      qc.invalidateQueries({ queryKey: ['users'] })
    } catch { toast.error('Failed to update user status.') }
  }

  const handleDelete = async (u: UserRow) => {
    if (!confirm(`Permanently delete ${u.first_name} ${u.last_name}? This cannot be undone.`)) return
    try {
      await usersAPI.delete(u.id as number)
      toast.success('User deleted.')
      qc.invalidateQueries({ queryKey: ['users'] })
    } catch { toast.error('Failed to delete user.') }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? 'Loading…' : `${allUsers.length} user${allUsers.length !== 1 ? 's' : ''} registered`}
          </p>
        </div>
        <Button onClick={() => setCreating(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, username, email…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8 h-9" />
        </div>
        <Select value={roleFilter || '__all__'} onValueChange={(v) => setRoleFilter(v === '__all__' ? '' : v)}>
          <SelectTrigger className="h-9 w-[210px]">
            <Shield className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Roles</SelectItem>
            {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter || '__all__'} onValueChange={(v) => setStatusFilter(v === '__all__' ? '' : v)}>
          <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Status</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center text-muted-foreground">No users match the current filters.</TableCell>
                </TableRow>
              ) : users.map((u) => (
                <TableRow key={u.id as number}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {((u.first_name as string)?.[0] ?? '?').toUpperCase()}{((u.last_name as string)?.[0] ?? '').toUpperCase()}
                      </div>
                      <span className="font-medium">{u.first_name as string} {u.last_name as string}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{u.username as string}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{(u.email as string) || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={ROLE_VARIANT[u.role as string] ?? 'outline'} className="text-xs whitespace-nowrap">
                      {ROLE_LABELS[u.role as string] ?? (u.role as string) ?? '—'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.is_active ? 'success' : 'secondary'} className="cursor-pointer" onClick={() => handleToggleActive(u)}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.last_login ? new Date(u.last_login as string).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" title="Edit" onClick={() => setEditing(u)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" title="Reset password" onClick={() => setResetting(u)}>
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" title={u.is_active ? 'Deactivate' : 'Activate'} onClick={() => handleToggleActive(u)}>
                        {u.is_active
                          ? <UserX className="h-3.5 w-3.5 text-amber-500" />
                          : <UserCheck className="h-3.5 w-3.5 text-emerald-500" />}
                      </Button>
                      <Button size="sm" variant="ghost" title="Delete" onClick={() => handleDelete(u)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <UserDialog open={creating} onOpenChange={(v) => { if (!v) setCreating(false) }} editing={null} />
      {editing && <UserDialog open={!!editing} onOpenChange={(v) => { if (!v) setEditing(null) }} editing={editing} />}
      {resetting && <ResetPasswordDialog open={!!resetting} onOpenChange={(v) => { if (!v) setResetting(null) }} user={resetting} />}
    </div>
  )
}
