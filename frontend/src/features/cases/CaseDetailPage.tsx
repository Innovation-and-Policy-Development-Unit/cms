import { useState, useRef } from 'react'
import { useParams, useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  CheckCircle2, Upload, Trash2, FileText, Send,
  User, Calendar, Building, Briefcase, Plus, Lock,
  StickyNote, MessageSquare,
} from 'lucide-react'
import { PortalTimelineStepper } from './PortalTimelineStepper'
import { CaseDetailActions } from './CaseDetailActions'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { TableEmptyState } from '@/components/ui/empty-state'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { SlaBadge } from '@/components/ui/sla-badge'
import { DocumentUploadDialog } from '@/components/documents/DocumentUploadDialog'
import {
  CASE_DETAIL_TAB_LABEL,
  type CaseDetailSearch,
  type CaseDetailTab,
} from './caseDetailSearch'
import {
  CASE_FAMILIES,
  DECISION_OUTCOME_OPTIONS,
  FAMILY_LABEL,
  PORTAL_APPROVAL_LABEL,
  PORTAL_APPROVAL_VARIANT,
  STAGE_STATUS_VARIANT,
} from '@/lib/case-labels'
import { casesAPI, documentsAPI, auditAPI } from '@/api/ccms'
import { usePermissions } from '@/hooks/use-permissions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

/* ─── Progress Tracker ──────────────────────────────────────── */
function ProgressTracker({ stages }: { stages: Record<string, unknown>[] }) {
  if (!stages?.length) return null
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max items-start gap-0">
        {stages.map((stage, i) => {
          const status    = stage.status as string
          const isCompleted = status === 'completed'
          const isActive    = status === 'in_progress'
          const isLast      = i === stages.length - 1
          return (
            <div key={stage.id as number} className="flex items-start">
              <div className="flex flex-col items-center">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                  isCompleted ? 'border-emerald-500 bg-emerald-500 text-white'
                  : isActive   ? 'border-primary bg-primary text-white'
                  :              'border-border bg-card text-muted-foreground'
                }`}>
                  {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                <div className="mt-2 w-24 text-center">
                  <p className={`text-[10px] font-medium leading-tight ${
                    isActive ? 'text-primary' : isCompleted ? 'text-emerald-600' : 'text-muted-foreground'
                  }`}>{stage.stage_name as string}</p>
                  {stage.due_date && (
                    <p className="text-[9px] text-muted-foreground mt-0.5">{stage.due_date as string}</p>
                  )}
                </div>
              </div>
              {!isLast && (
                <div className={`mt-4 h-0.5 w-8 shrink-0 ${isCompleted ? 'bg-emerald-500' : 'bg-border'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Overview Tab ──────────────────────────────────────────── */
function OverviewTab({ c, isEmployee, isActive, caseId }: {
  c: Record<string, unknown>
  isEmployee: boolean
  isActive: boolean
  caseId: string
}) {
  const qc = useQueryClient()
  const [response, setResponse] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fields = [
    { icon: Briefcase, label: 'Case Type',        value: FAMILY_LABEL[c.case_family as string] ?? (c.case_family as string)?.replace(/_/g, ' ') },
    { icon: User,      label: 'Subject Name',     value: c.subject_name as string },
    { icon: Briefcase, label: 'Position / Title', value: (c.subject_position as string) || '—' },
    { icon: Building,  label: 'Ministry / Dept',  value: (c.subject_ministry as string) || '—' },
    { icon: Calendar,  label: 'Date Received',    value: c.date_received as string },
    { icon: User,      label: 'Assigned Officer', value: c.assigned_officer_detail
        ? `${(c.assigned_officer_detail as Record<string, string>).first_name} ${(c.assigned_officer_detail as Record<string, string>).last_name}`
        : '—' },
  ]

  const handleResponse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!response.trim()) return
    setSubmitting(true)
    try {
      await casesAPI.submitResponse(caseId, { content: response })
      qc.invalidateQueries({ queryKey: ['case', caseId] })
      toast.success('Response submitted.')
      setResponse('')
    } catch { toast.error('Failed to submit response.') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Case Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium capitalize">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {Boolean(c.description) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Description / Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">{c.description as string}</p>
          </CardContent>
        </Card>
      )}

      {Boolean(c.portal_approval_notes) && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Portal approval notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{c.portal_approval_notes as string}</p>
          </CardContent>
        </Card>
      )}

      {/* Employee Response Panel — only shown to the employee/subject */}
      {isEmployee && isActive && (
        <Card className="border-blue-200 bg-blue-50/40 dark:border-blue-900 dark:bg-blue-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              Your Response
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Show existing responses if any */}
            {(c.responses as Record<string, unknown>[] | undefined)?.map((r) => (
              <div key={r.id as number} className="mb-3 rounded-lg bg-white dark:bg-blue-950/40 border p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  Submitted {new Date(r.created_at as string).toLocaleString()}
                </p>
                <p className="text-sm">{r.content as string}</p>
              </div>
            ))}
            <form onSubmit={handleResponse} className="space-y-2">
              <Textarea
                rows={4}
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Write your response to the allegation or grievance here…"
              />
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={submitting || !response.trim()} className="gap-1.5">
                  <Send className="h-3.5 w-3.5" />
                  {submitting ? 'Submitting…' : 'Submit Response'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/* ─── Stages / Tasks Tab ────────────────────────────────────── */
function StagesTab({ stages, canComplete, onComplete }: {
  stages: Record<string, unknown>[]
  canComplete: boolean
  onComplete: (id: number) => void
}) {
  return (
    <div className="space-y-2">
      {stages?.map((stage) => (
        <Card key={stage.id as number}
          className={stage.status === 'in_progress' ? 'border-primary/50 shadow-sm' : ''}>
          <CardContent className="flex items-center justify-between py-4 px-5">
            <div className="flex items-center gap-4">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                stage.status === 'completed'   ? 'bg-emerald-100 text-emerald-700'
                : stage.status === 'in_progress' ? 'bg-primary/10 text-primary'
                : 'bg-muted text-muted-foreground'
              }`}>
                {stage.status === 'completed' ? <CheckCircle2 className="h-4 w-4" /> : stage.stage_order as number}
              </div>
              <div>
                <p className="text-sm font-semibold">{stage.stage_name as string}</p>
                {stage.due_date && (
                  <p className="text-xs text-muted-foreground">
                    Due: {stage.due_date as string} · {stage.days_until_due as number} days remaining
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <SlaBadge status={stage.sla_status as string} size="sm" />
              <Badge variant={STAGE_STATUS_VARIANT[stage.status as string] ?? 'secondary'}>
                {stage.status as string}
              </Badge>
              {stage.status === 'in_progress' && canComplete && (
                <Button size="sm" variant="outline" onClick={() => onComplete(stage.id as number)}>
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Complete
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/* ─── Decisions Tab ─────────────────────────────────────────── */
function DecisionsTab({ decisions, canAdd, onAdd }: {
  decisions: Record<string, unknown>[]
  canAdd: boolean
  onAdd: () => void
}) {
  return (
    <div className="space-y-3">
      {canAdd && (
        <div className="flex justify-end">
          <Button size="sm" onClick={onAdd} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Record Decision
          </Button>
        </div>
      )}
      {decisions?.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">No decisions recorded yet.</div>
      ) : decisions?.map((d) => (
        <Card key={d.id as number}>
          <CardContent className="py-4 px-5">
            <div className="flex items-start justify-between gap-2 mb-2">
              <Badge variant="default" className="uppercase">{(d.outcome as string)?.replace(/_/g, ' ')}</Badge>
              <span className="text-xs text-muted-foreground">{d.decided_at as string}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-1">
              By: <span className="font-medium">{d.decided_by_name as string}</span> — {d.decided_by_role as string}
            </p>
            <p className="text-sm leading-relaxed">{d.narrative as string}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/* ─── Documents Tab ─────────────────────────────────────────── */
function DocumentsTab({
  caseId,
  caseLabel,
  canUpload,
  canDelete,
}: {
  caseId: string
  caseLabel: string
  canUpload: boolean
  canDelete: boolean
}) {
  const qc = useQueryClient()
  const [uploadOpen, setUploadOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['documents', { case: caseId }],
    queryFn: () => documentsAPI.list({ case: caseId }).then((r) => r.data),
  })
  const docs: Record<string, unknown>[] = data?.results ?? data ?? []

  const colSpan = canDelete ? 6 : 5

  return (
    <div className="space-y-3">
      {canUpload && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setUploadOpen(true)}
            className="gap-1.5"
          >
            <Upload className="h-3.5 w-3.5" /> Upload document
          </Button>
          <DocumentUploadDialog
            open={uploadOpen}
            onOpenChange={setUploadOpen}
            caseId={caseId}
            caseLabel={caseLabel}
          />
        </div>
      )}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Size</TableHead>
                {canDelete && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: colSpan }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : docs.length === 0 ? (
                <TableEmptyState
                  colSpan={colSpan}
                  icon={FileText}
                  title="No documents on this case"
                  description="Attach investigation reports, notices, and evidence here."
                >
                  {canUpload && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setUploadOpen(true)}
                      className="gap-1.5"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Upload document
                    </Button>
                  )}
                </TableEmptyState>
              ) : docs.map((d) => (
                <TableRow key={d.id as number}>
                  <TableCell className="font-medium">{d.title as string}</TableCell>
                  <TableCell><Badge variant="secondary">{(d.doc_type as string)?.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell className="text-xs">{(d.uploaded_by_name as string) ?? '—'}</TableCell>
                  <TableCell className="text-xs">{(d.uploaded_at as string)?.split('T')[0]}</TableCell>
                  <TableCell className="text-xs">{d.file_size ? `${Math.round((d.file_size as number) / 1024)} KB` : '—'}</TableCell>
                  {canDelete && (
                    <TableCell>
                      <Button size="sm" variant="ghost"
                        onClick={() => documentsAPI.delete(d.id as number).then(() =>
                          qc.invalidateQueries({ queryKey: ['documents', { case: caseId }] })
                        )}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

/* ─── Internal Notes Tab ────────────────────────────────────── */
function InternalNotesTab({ caseId }: { caseId: string }) {
  const qc = useQueryClient()
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteNoteId, setDeleteNoteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['notes', caseId],
    queryFn: () => casesAPI.listNotes(caseId).then((r) => r.data),
  })
  const notes: Record<string, unknown>[] = data?.results ?? data ?? []

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!note.trim()) return
    setSaving(true)
    try {
      await casesAPI.addNote(caseId, { content: note, is_private: true })
      qc.invalidateQueries({ queryKey: ['notes', caseId] })
      toast.success('Note added.')
      setNote('')
    } catch { toast.error('Failed to save note.') }
    finally { setSaving(false) }
  }

  const handleDeleteConfirm = async () => {
    if (deleteNoteId == null) return
    setDeleting(true)
    try {
      await casesAPI.deleteNote(caseId, deleteNoteId)
      qc.invalidateQueries({ queryKey: ['notes', caseId] })
      toast.success('Note deleted.')
      setDeleteNoteId(null)
    } catch {
      toast.error('Failed to delete note.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <ConfirmDialog
        open={deleteNoteId != null}
        onOpenChange={(open) => !open && setDeleteNoteId(null)}
        title="Delete internal note?"
        description="This private note will be permanently removed. It cannot be recovered from the audit trail as note text."
        confirmLabel="Delete note"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
      />
      <Card className="border-amber-200 bg-amber-50/30 dark:border-amber-900 dark:bg-amber-950/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-amber-500" />
            Add Internal Note
            <Badge variant="warning" className="ml-auto text-[10px]">Private — Compliance Only</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="space-y-2">
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a private note visible only to Compliance Unit and Secretary…"
            />
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={saving || !note.trim()} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Add Note'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
      ) : notes.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground text-sm">No internal notes yet.</p>
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <Card key={n.id as number} className="border-l-2 border-l-amber-400">
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">{(n.author_name as string) ?? 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(n.created_at as string).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed">{n.content as string}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteNoteId(n.id as number)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Audit Tab ─────────────────────────────────────────────── */
function AuditTab({ caseId }: { caseId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['audit', { case: caseId }],
    queryFn: () => auditAPI.list({ resource_id: caseId, resource_type: 'case' }).then((r) => r.data),
  })
  const logs: Record<string, unknown>[] = data?.results ?? data ?? []
  return (
    <div className="space-y-2">
      {isLoading ? (
        Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
      ) : logs.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No audit entries for this case.</p>
      ) : (
        <ol className="relative ml-4 space-y-5 border-l border-border">
          {logs.map((log) => (
            <li key={log.id as number} className="ml-5">
              <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-card bg-primary" />
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  {(log.action as string)?.replace(/_/g, ' ')}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(log.timestamp as string).toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">· {(log.user_name as string) ?? 'System'}</span>
              </div>
              <p className="mt-0.5 text-sm">{log.description as string}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

/* ─── Litigation Tab ────────────────────────────────────────── */
function LitigationTab({ records }: { records: Record<string, unknown>[] }) {
  return records?.length === 0 ? (
    <p className="py-12 text-center text-muted-foreground">No litigation records.</p>
  ) : (
    <div className="space-y-2">
      {records?.map((l) => (
        <Card key={l.id as number}>
          <CardContent className="py-4 px-5">
            <div className="flex items-center justify-between mb-1">
              <strong className="text-sm">{(l.court_reference as string) || 'Litigation'}</strong>
              <Badge variant={l.status === 'active' ? 'warning' : 'secondary'}>{l.status as string}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{l.description as string}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/* ─── Access Denied placeholder ─────────────────────────────── */
function RestrictedTab() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
      <Lock className="h-10 w-10 opacity-20" />
      <p className="font-medium">Access Restricted</p>
      <p className="text-xs">You do not have permission to view this section.</p>
    </div>
  )
}

/* ─── Edit Metadata Dialog ──────────────────────────────────── */
function EditMetadataDialog({ open, onOpenChange, caseId, current }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  caseId: string
  current: Record<string, unknown>
}) {
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    case_family:      (current.case_family      as string) ?? '',
    subject_name:     (current.subject_name     as string) ?? '',
    subject_position: (current.subject_position as string) ?? '',
    subject_ministry: (current.subject_ministry as string) ?? '',
    description:      (current.description      as string) ?? '',
  })

  const set = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await casesAPI.update(caseId, form)
      qc.invalidateQueries({ queryKey: ['case', caseId] })
      toast.success('Case updated.')
      onOpenChange(false)
    } catch { toast.error('Failed to update case.') }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Edit Case Metadata</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Case Type</Label>
            <Select value={form.case_family} onValueChange={(v) => set('case_family', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CASE_FAMILIES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Subject Full Name *</Label>
              <Input value={form.subject_name} onChange={(e) => set('subject_name', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Position / Title</Label>
              <Input value={form.subject_position} onChange={(e) => set('subject_position', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Ministry / Department</Label>
            <Input value={form.subject_ministry} onChange={(e) => set('subject_ministry', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Description / Summary</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Decision Dialog ───────────────────────────────────────── */
function DecisionDialog({ open, onOpenChange, caseId }: {
  open: boolean; onOpenChange: (v: boolean) => void; caseId: string
}) {
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    outcome: '', decided_by_name: '', decided_by_role: '',
    decided_at: new Date().toISOString().split('T')[0], narrative: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await casesAPI.addDecision(caseId, form as Record<string, unknown>)
      qc.invalidateQueries({ queryKey: ['case', caseId] })
      onOpenChange(false)
      toast.success('Decision recorded.')
    } catch { toast.error('Failed to save decision.') }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Record Decision</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Outcome *</Label>
            <Select onValueChange={(v) => setForm((p) => ({ ...p, outcome: v }))} required>
              <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
              <SelectContent>
                {DECISION_OUTCOME_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Decided By (Name) *</Label>
              <Input value={form.decided_by_name} onChange={(e) => setForm((p) => ({ ...p, decided_by_name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Input value={form.decided_by_role} onChange={(e) => setForm((p) => ({ ...p, decided_by_role: e.target.value }))} placeholder="e.g. Commissioner" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Decision Date *</Label>
            <Input type="date" value={form.decided_at} onChange={(e) => setForm((p) => ({ ...p, decided_at: e.target.value }))} required />
          </div>
          <div className="space-y-1.5">
            <Label>Narrative *</Label>
            <Textarea rows={4} value={form.narrative} onChange={(e) => setForm((p) => ({ ...p, narrative: e.target.value }))} required />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Decision'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Main Page ─────────────────────────────────────────────── */
export default function CaseDetailPage() {
  const { id: idParam } = useParams({ strict: false })
  const navigate = useNavigate()
  const tabSearch = useSearch({ strict: false }) as CaseDetailSearch
  const qc = useQueryClient()
  const p = usePermissions()
  const [showDecision, setShowDecision]   = useState(false)
  const [showEditMeta, setShowEditMeta]   = useState(false)
  const [showRegisterPortal, setShowRegisterPortal] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [rejectNotes, setRejectNotes] = useState('')
  const [portalBusy, setPortalBusy] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [confirmReopen, setConfirmReopen] = useState(false)
  const [closeBusy, setCloseBusy] = useState(false)

  if (!idParam || !/^\d+$/.test(idParam)) {
    navigate({ to: '/cases' })
    return null
  }
  const id = idParam

  const { data: c, isLoading } = useQuery({
    queryKey: ['case', id],
    queryFn:  () => casesAPI.detail(id).then((r) => r.data),
  })

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )

  if (!c) return <p className="py-16 text-center text-muted-foreground">Case not found.</p>

  const isActive = c.status === 'active'
  const isClosed = c.status === 'closed'

  const handleCloseConfirm = async () => {
    setCloseBusy(true)
    try {
      await casesAPI.close(id)
      qc.invalidateQueries({ queryKey: ['case', id] })
      qc.invalidateQueries({ queryKey: ['cases'] })
      toast.success('Case closed.')
      setConfirmClose(false)
    } catch {
      toast.error('Failed to close case.')
    } finally {
      setCloseBusy(false)
    }
  }

  const handleReopenConfirm = async () => {
    setCloseBusy(true)
    try {
      await casesAPI.reopen(id)
      qc.invalidateQueries({ queryKey: ['case', id] })
      qc.invalidateQueries({ queryKey: ['cases'] })
      toast.success('Case reopened.')
      setConfirmReopen(false)
    } catch {
      toast.error('Failed to reopen case.')
    } finally {
      setCloseBusy(false)
    }
  }

  const handleStageComplete = async (stageId: number) => {
    await casesAPI.updateStage(id, stageId, { status: 'completed' })
    qc.invalidateQueries({ queryKey: ['case', id] })
    toast.success('Stage marked as completed.')
  }

  const portalStatus = c.portal_approval_status as string | undefined

  const handleRegisterPortal = async () => {
    setPortalBusy(true)
    try {
      const data = await casesAPI.registerWithPortal(id).then((r) => r.data)
      qc.invalidateQueries({ queryKey: ['case', id] })
      qc.invalidateQueries({ queryKey: ['cases', 'pending-approval-count'] })
      toast.success(`Registered with portal: ${data.cdp_submission_id}`)
      setShowRegisterPortal(false)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(detail || 'Portal registration failed.')
    } finally {
      setPortalBusy(false)
    }
  }

  const handleSubmitForApproval = async () => {
    setPortalBusy(true)
    try {
      await casesAPI.submitForApproval(id)
      qc.invalidateQueries({ queryKey: ['case', id] })
      qc.invalidateQueries({ queryKey: ['cases', 'pending-approval-count'] })
      qc.invalidateQueries({ queryKey: ['cases', 'approval-queue'] })
      toast.success('Submitted for manager approval.')
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(detail || 'Submit failed.')
    } finally {
      setPortalBusy(false)
    }
  }

  const handleApprovePortal = async () => {
    setPortalBusy(true)
    try {
      const { data } = await casesAPI.approvePortal(id)
      qc.invalidateQueries({ queryKey: ['case', id] })
      qc.invalidateQueries({ queryKey: ['cases', 'pending-approval-count'] })
      qc.invalidateQueries({ queryKey: ['cases', 'approval-queue'] })
      const sync = data.portal_sync as { status?: string; cdp_submission_id?: string; detail?: string } | undefined
      if (sync?.status === 'synced') {
        toast.success(`Approved and synced to SCDMS (${sync.cdp_submission_id ?? 'linked'}).`)
      } else if (sync?.status === 'failed') {
        toast.warning('Approved, but SCDMS sync failed. Use Retry sync to SCDMS.')
      } else if (sync?.status === 'skipped') {
        toast.success('Approved. SCDMS will pull this case via API or retry sync when configured.')
      } else {
        toast.success('Approved for SCDMS registration.')
      }
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(detail || 'Approval failed.')
    } finally {
      setPortalBusy(false)
    }
  }

  const handleRejectPortal = async () => {
    if (!rejectNotes.trim()) {
      toast.error('Rejection notes are required.')
      return
    }
    setPortalBusy(true)
    try {
      await casesAPI.rejectPortal(id, { notes: rejectNotes })
      qc.invalidateQueries({ queryKey: ['case', id] })
      qc.invalidateQueries({ queryKey: ['cases', 'pending-approval-count'] })
      qc.invalidateQueries({ queryKey: ['cases', 'approval-queue'] })
      toast.success('Case rejected for portal registration.')
      setShowReject(false)
      setRejectNotes('')
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(detail || 'Rejection failed.')
    } finally {
      setPortalBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* ── Header bar ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Breadcrumbs
            items={[
              { label: 'Cases', to: '/cases' },
              { label: c.reference_number as string },
              ...(tabSearch.tab !== 'overview'
                ? [{ label: CASE_DETAIL_TAB_LABEL[tabSearch.tab as CaseDetailTab] }]
                : []),
            ]}
          />
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold font-mono">{c.reference_number}</h1>
            <Badge variant={isActive ? 'default' : 'secondary'} className="capitalize">{c.status}</Badge>
            {c.is_senior_executive && <Badge variant="info">Senior Executive</Badge>}
            {portalStatus && (
              <Badge variant={PORTAL_APPROVAL_VARIANT[portalStatus] ?? 'secondary'}>
                {PORTAL_APPROVAL_LABEL[portalStatus] ?? portalStatus}
              </Badge>
            )}
            {c.portal_form_type_code && (
              <Badge variant="outline" className="font-mono text-xs">{c.portal_form_type_code as string}</Badge>
            )}
            <SlaBadge status={c.overall_sla_status as string} />
          </div>
          <p className="mt-1 text-base font-semibold">{c.subject_name}</p>
          <p className="text-sm text-muted-foreground">
            {c.subject_position && `${c.subject_position} · `}{c.subject_ministry}
          </p>
        </div>

        <CaseDetailActions
          caseData={c}
          isActive={isActive}
          isClosed={isClosed}
          portalBusy={portalBusy}
          onEdit={() => setShowEditMeta(true)}
          onRecordDecision={() => setShowDecision(true)}
          onSubmitForApproval={handleSubmitForApproval}
          onApprovePortal={handleApprovePortal}
          onRejectPortal={() => setShowReject(true)}
          onRetryScdms={() => setShowRegisterPortal(true)}
          onCloseCase={() => setConfirmClose(true)}
          onReopenCase={() => setConfirmReopen(true)}
        />
      </div>

      {/* ── SCDMS / portal journey ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">SCDMS &amp; portal journey</CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          <PortalTimelineStepper caseData={c} />
        </CardContent>
      </Card>

      {/* ── Progress tracker ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Workflow Progress</CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          <ProgressTracker stages={c.stages ?? []} />
        </CardContent>
      </Card>

      {/* ── Tabs ── */}
      <Tabs
        value={tabSearch.tab}
        onValueChange={(v) =>
          navigate({
            to: '/cases/$id',
            params: { id },
            search: { tab: v as CaseDetailTab },
          })
        }
      >
        <TabsList className="mb-0 flex-wrap h-auto gap-y-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stages">Tasks / Stages</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          {p.canSeeDecisions    && <TabsTrigger value="decisions">Decisions</TabsTrigger>}
          {p.canSeeLitigation   && <TabsTrigger value="litigation">Litigation</TabsTrigger>}
          {p.canSeeAuditTab     && <TabsTrigger value="audit">Audit Log</TabsTrigger>}
          {p.canSeeInternalNotes && <TabsTrigger value="notes">Internal Notes</TabsTrigger>}
        </TabsList>

        <div className="mt-4">
          <TabsContent value="overview">
            <OverviewTab
              c={c}
              isEmployee={p.isEmployee}
              isActive={isActive}
              caseId={id}
            />
          </TabsContent>

          <TabsContent value="stages">
            <StagesTab
              stages={c.stages ?? []}
              canComplete={isActive && p.canCompleteStage}
              onComplete={handleStageComplete}
            />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentsTab
              caseId={id}
              caseLabel={c.reference_number as string}
              canUpload={p.canUploadDocs}
              canDelete={p.canDeleteDocs}
            />
          </TabsContent>

          {p.canSeeDecisions && (
            <TabsContent value="decisions">
              <DecisionsTab
                decisions={c.decisions ?? []}
                canAdd={isActive && p.canRecordDecision}
                onAdd={() => setShowDecision(true)}
              />
            </TabsContent>
          )}

          {p.canSeeLitigation && (
            <TabsContent value="litigation">
              <LitigationTab records={c.litigation_records ?? []} />
            </TabsContent>
          )}

          {p.canSeeAuditTab && (
            <TabsContent value="audit">
              {p.canSeeAuditTrail ? <AuditTab caseId={id} /> : <RestrictedTab />}
            </TabsContent>
          )}

          {p.canSeeInternalNotes && (
            <TabsContent value="notes">
              <InternalNotesTab caseId={id} />
            </TabsContent>
          )}
        </div>
      </Tabs>

      {/* ── Dialogs ── */}
      <DecisionDialog   open={showDecision} onOpenChange={setShowDecision} caseId={id} />
      {p.canEditMetadata && (
        <EditMetadataDialog open={showEditMeta} onOpenChange={setShowEditMeta} caseId={id} current={c} />
      )}

      <Dialog open={showRegisterPortal} onOpenChange={setShowRegisterPortal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Retry sync to SCDMS</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Push this approved case to SCDMS (Submissions list → Secretary review). Type:{' '}
            <strong>{(c.portal_form_type_code as string) || '—'}</strong>
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowRegisterPortal(false)}>Cancel</Button>
            <Button type="button" disabled={portalBusy} onClick={handleRegisterPortal}>
              {portalBusy ? 'Syncing…' : 'Sync to SCDMS'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReject} onOpenChange={setShowReject}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Portal Registration</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Notes *</Label>
            <Textarea rows={3} value={rejectNotes} onChange={(e) => setRejectNotes(e.target.value)} required />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowReject(false)}>Cancel</Button>
            <Button type="button" variant="destructive" disabled={portalBusy} onClick={handleRejectPortal}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmClose}
        onOpenChange={setConfirmClose}
        title="Close this case?"
        description={
          <>
            <p>The case will be marked <strong>closed</strong> in CMS. Open SLA stages will stop advancing here.</p>
            {c.cdp_submission_id ? (
              <p className="text-amber-700 dark:text-amber-400">
                This case is linked to SCDMS ({c.cdp_submission_id as string}). Secretary and Commission
                steps should be completed in SCDMS; CMS close reflects the compliance record only.
              </p>
            ) : (
              <p>If you later register with SCDMS, reopen the case before syncing.</p>
            )}
          </>
        }
        confirmLabel="Close case"
        variant="destructive"
        loading={closeBusy}
        onConfirm={handleCloseConfirm}
      />

      <ConfirmDialog
        open={confirmReopen}
        onOpenChange={setConfirmReopen}
        title="Reopen this case?"
        description="The case returns to active status in CMS. Workflow stages and portal approval state are unchanged."
        confirmLabel="Reopen case"
        loading={closeBusy}
        onConfirm={handleReopenConfirm}
      />
    </div>
  )
}
