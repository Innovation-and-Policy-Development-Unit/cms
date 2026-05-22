import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Users, UserPlus, UserMinus, Search, ChevronDown, ChevronRight } from 'lucide-react'
import { groupsAPI, usersAPI } from '@/api/ccms'
import { ROLE_LABELS } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

type GroupRow = Record<string, unknown>
type UserRow  = Record<string, unknown>

/* ─── Create / Edit Group Dialog ─────────────────────────────────────────── */
function GroupDialog({ open, onOpenChange, editing }: {
  open: boolean; onOpenChange: (v: boolean) => void; editing: GroupRow | null
}) {
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState((editing?.name as string) ?? '')
  const isEdit = !!editing

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      if (isEdit) { await groupsAPI.update(editing!.id as number, { name }); toast.success('Group updated.') }
      else        { await groupsAPI.create({ name });                         toast.success('Group created.') }
      qc.invalidateQueries({ queryKey: ['groups'] })
      onOpenChange(false)
    } catch { toast.error('Failed to save group.') }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{isEdit ? 'Rename Group' : 'Create Group'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Group Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Disciplinary Committee" required autoFocus />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !name.trim()}>{saving ? 'Saving…' : isEdit ? 'Save' : 'Create Group'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Add Member Dialog ──────────────────────────────────────────────────── */
function AddMemberDialog({ open, onOpenChange, group, memberIds }: {
  open: boolean; onOpenChange: (v: boolean) => void; group: GroupRow; memberIds: Set<number>
}) {
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [selectedId, setSelectedId] = useState('')

  const { data } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersAPI.list().then((r) => r.data),
  })
  const allUsers: UserRow[] = data?.results ?? data ?? []
  const available = allUsers.filter((u) => !memberIds.has(u.id as number))

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedId) return
    setSaving(true)
    try {
      await groupsAPI.addMember(group.id as number, Number(selectedId))
      qc.invalidateQueries({ queryKey: ['group-members', group.id] })
      toast.success('Member added.')
      onOpenChange(false)
      setSelectedId('')
    } catch { toast.error('Failed to add member.') }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Member to {group.name as string}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="space-y-1.5">
            <Label>User *</Label>
            <Select value={selectedId} onValueChange={setSelectedId} required>
              <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
              <SelectContent>
                {available.length === 0
                  ? <div className="px-3 py-4 text-sm text-center text-muted-foreground">All users are already in this group</div>
                  : available.map((u) => (
                    <SelectItem key={u.id as number} value={String(u.id)}>
                      {u.first_name as string} {u.last_name as string} — {ROLE_LABELS[u.role as string] ?? u.role as string}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !selectedId}>{saving ? 'Adding…' : 'Add Member'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Group Card ─────────────────────────────────────────────────────────── */
function GroupCard({ group }: { group: GroupRow }) {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing]   = useState(false)
  const [adding, setAdding]     = useState(false)

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['group-members', group.id],
    queryFn:  () => groupsAPI.members(group.id as number).then((r) => r.data),
    enabled:  expanded,
  })
  const members: UserRow[] = membersData?.results ?? membersData ?? []
  const memberIds = new Set(members.map((m) => m.id as number))

  const handleRemoveMember = async (userId: number, name: string) => {
    if (!confirm(`Remove ${name} from this group?`)) return
    try {
      await groupsAPI.removeMember(group.id as number, userId)
      qc.invalidateQueries({ queryKey: ['group-members', group.id] })
      toast.success('Member removed.')
    } catch { toast.error('Failed to remove member.') }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete group "${group.name}"? This cannot be undone.`)) return
    try {
      await groupsAPI.delete(group.id as number)
      qc.invalidateQueries({ queryKey: ['groups'] })
      toast.success('Group deleted.')
    } catch { toast.error('Failed to delete group.') }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <button
            className="flex items-center gap-2.5 text-left flex-1"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded
              ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
            <div>
              <CardTitle className="text-base">{group.name as string}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {(group.user_count as number) ?? members.length} member{((group.user_count as number) ?? members.length) !== 1 ? 's' : ''}
              </p>
            </div>
          </button>
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="gap-1.5">
              <Users className="h-3 w-3" /> {(group.user_count as number) ?? '—'}
            </Badge>
            <Button size="sm" variant="ghost" title="Add member" onClick={() => { setExpanded(true); setAdding(true) }}>
              <UserPlus className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" title="Rename" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" title="Delete group" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          {membersLoading ? (
            Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12 w-full mb-2" />)
          ) : members.length === 0 ? (
            <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              No members yet.{' '}
              <button className="text-primary underline-offset-2 hover:underline" onClick={() => setAdding(true)}>
                Add the first member
              </button>
            </div>
          ) : (
            <div className="divide-y rounded-lg border">
              {members.map((m) => (
                <div key={m.id as number} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                      {((m.first_name as string)?.[0] ?? '?').toUpperCase()}{((m.last_name as string)?.[0] ?? '').toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">{m.first_name as string} {m.last_name as string}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {ROLE_LABELS[m.role as string] ?? (m.role as string)} · @{m.username as string}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" title="Remove from group"
                    onClick={() => handleRemoveMember(m.id as number, `${m.first_name} ${m.last_name}`)}>
                    <UserMinus className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}

      {editing && <GroupDialog open={editing} onOpenChange={(v) => { if (!v) setEditing(false) }} editing={group} />}
      {adding  && <AddMemberDialog open={adding} onOpenChange={(v) => { if (!v) setAdding(false) }} group={group} memberIds={memberIds} />}
    </Card>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function GroupsPage() {
  const [q, setQ]           = useState('')
  const [creating, setCreating] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupsAPI.list().then((r) => r.data),
  })

  const allGroups: GroupRow[] = data?.results ?? data ?? []
  const groups = allGroups.filter((g) =>
    !q || (g.name as string).toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Groups</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? 'Loading…' : `${allGroups.length} group${allGroups.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button onClick={() => setCreating(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Group
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search groups…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8 h-9" />
      </div>

      {/* Group list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-muted-foreground">
          <Users className="h-10 w-10 opacity-20" />
          <p className="font-medium">{q ? 'No groups match your search' : 'No groups yet'}</p>
          {!q && (
            <Button size="sm" variant="outline" onClick={() => setCreating(true)} className="mt-1 gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Create the first group
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => <GroupCard key={g.id as number} group={g} />)}
        </div>
      )}

      <GroupDialog open={creating} onOpenChange={(v) => { if (!v) setCreating(false) }} editing={null} />
    </div>
  )
}
