import { useState, useRef } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeft, CheckCircle2, Upload, Trash2, FileText,
  User, Calendar, Building, Briefcase, Plus, Lock,
  Pencil, RotateCcw, StickyNote, Send, MessageSquare,
} from 'lucide-react'
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

/* ─── Constants ─────────────────────────────────────────────── */
const SLA_VARIANT: Record<string, 'destructive' | 'warning' | 'success' | 'secondary'> = {
  overdue: 'destructive', at_risk: 'warning', on_track: 'success', completed: 'secondary',
}

const STATUS_STAGE_VARIANT: Record<string, 'success' | 'info' | 'secondary'> = {
  completed: 'success', in_progress: 'info', pending: 'secondary',
}

const DECISION_OUTCOMES = [
  { value: 'reinstate',         label: 'Reinstated' },
  { value: 'terminate',         label: 'Terminated / Dismissed' },
  { value: 'warn',              label: 'Formal Warning Issued' },
  { value: 'demote',            label: 'Demotion' },
  { value: 'suspend_no_pay',    label: 'Suspension Without Pay' },
  { value: 'compulsory_retire', label: 'Compulsory Retirement' },
  { value: 'no_action',         label: 'No Further Action' },
  { value: 'settled',           label: 'Settled (Grievance)' },
  { value: 'not_settled',       label: 'Not Settled (Grievance)' },
]

const FAMILY_LABEL: Record<string, string> = {
  employee_disciplinary:       'Employee Disciplinary',
  serious_misconduct_employee: 'Serious Misconduct',
  temporary_suspension:        'Temp. Suspension',
  grievance:                   'Grievance',
  senior_serious_misconduct:   'Senior — Serious Misconduct',
  senior_poor_performance:     'Senior — Poor Performance',
}

const CASE_FAMILIES = [
  { value: 'employee_disciplinary',       label: 'Employee Internal Disciplinary' },
  { value: 'serious_misconduct_employee', label: 'Serious Misconduct — Employee' },
  { value: 'temporary_suspension',        label: 'Temporary Suspension' },
  { value: 'grievance',                   label: 'Grievance Process' },
  { value: 'senior_serious_misconduct',   label: 'Senior Executive — Serious Misconduct' },
  { value: 'senior_poor_performance',     label: 'Senior Executive — Poor Performance' },
]

const PORTAL_APPROVAL_LABEL: Record<string, string> = {
  draft: 'Draft',
  pending_manager: 'Pending Manager Approval',
  approved: 'Approved for Portal',
  rejected: 'Rejected',
  sent_to_portal: 'Sent to Commission Portal',
}

const PORTAL_APPROVAL_VARIANT: Record<string, 'default' | 'secondary' | 'warning' | 'success' | 'destructive' | 'info'> = {
  draft: 'secondary',
  pending_manager: 'warning',
  approved: 'success',
  rejected: 'destructive',
  sent_to_portal: 'info',
}

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

      {c.description && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Description / Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">{c.description as string}</p>
          </CardContent>
        </Card>
      )}

      {c.portal_approval_notes && (
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
              <Badge variant={SLA_VARIANT[stage.sla_status as string] ?? 'secondary'}>
                {(stage.sla_status as string)?.replace('_', ' ')}
              </Badge>
              <Badge variant={STATUS_STAGE_VARIANT[stage.status as string] ?? 'secondary'}>
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
function DocumentsTab({ caseId, canUpload, canDelete }: {
  caseId: string; canUpload: boolean; canDelete: boolean
}) {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['documents', { case: caseId }],
    queryFn: () => documentsAPI.list({ case: caseId }).then((r) => r.data),
  })
  const docs: Record<string, unknown>[] = data?.results ?? data ?? []

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    fd.append('title', file.name)
    fd.append('doc_type', 'other')
    fd.append('case', caseId)
    setUploading(true)
    try {
      await documentsAPI.upload(fd)
      qc.invalidateQueries({ queryKey: ['documents', { case: caseId }] })
      toast.success('Document uploaded.')
    } catch { toast.error('Upload failed.') }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  const colSpan = canDelete ? 6 : 5

  return (
    <div className="space-y-3">
      {canUpload && (
        <div className="flex justify-end">
          <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-1.5">
            <Upload className="h-3.5 w-3.5" /> {uploading ? 'Uploading…' : 'Upload Document'}
          </Button>
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
                <TableRow>
                  <TableCell colSpan={colSpan} className="py-12 text-center text-muted-foreground">
                    <FileText className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    No documents attached to this case.
                  </TableCell>
                </TableRow>
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

  const handleDelete = async (noteId: number) => {
    if (!confirm('Delete this note?')) return
    await casesAPI.deleteNote(caseId, noteId)
    qc.invalidateQueries({ queryKey: ['notes', caseId] })
    toast.success('Note deleted.')
  }

  return (
    <div className="space-y-4">
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
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(n.id as number)}>
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
                {DECISION_OUTCOMES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
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
  const { id } = useParams({ strict: false })
  const navigate = useNavigate()
  const qc = useQueryClient()
  const p = usePermissions()
  const [showDecision, setShowDecision]   = useState(false)
  const [showEditMeta, setShowEditMeta]   = useState(false)
  const [showRegisterPortal, setShowRegisterPortal] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [rejectNotes, setRejectNotes] = useState('')
  const [portalBusy, setPortalBusy] = useState(false)

  const { data: c, isLoading } = useQuery({
    queryKey: ['case', id],
    queryFn:  () => casesAPI.detail(id).then((r) => r.data),
    enabled:  /^\d+$/.test(id),
  })

  if (!/^\d+$/.test(id)) { navigate({ to: '/cases' }); return null }

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

  const handleClose = async () => {
    if (!confirm('Close this case? This marks it as closed and final.')) return
    await casesAPI.close(id)
    qc.invalidateQueries({ queryKey: ['case', id] })
    toast.success('Case closed.')
  }

  const handleReopen = async () => {
    if (!confirm('Reopen this case?')) return
    try {
      await casesAPI.reopen(id)
      qc.invalidateQueries({ queryKey: ['case', id] })
      toast.success('Case reopened.')
    } catch { toast.error('Failed to reopen case.') }
  }

  const handleStageComplete = async (stageId: number) => {
    await casesAPI.updateStage(id, stageId, { status: 'completed' })
    qc.invalidateQueries({ queryKey: ['case', id] })
    toast.success('Stage marked as completed.')
  }

  const portalStatus = c.portal_approval_status as string | undefined
  const canRetryScdmsSync =
    isActive && !c.cdp_submission_id && p.canRecordDecision
    && portalStatus === 'approved'

  const handleRegisterPortal = async () => {
    setPortalBusy(true)
    try {
      const data = await casesAPI.registerWithPortal(id).then((r) => r.data)
      qc.invalidateQueries({ queryKey: ['case', id] })
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
          <Button variant="ghost" size="sm" className="mb-2 -ml-2 gap-1 text-muted-foreground"
            onClick={() => navigate({ to: '/cases' })}>
            <ArrowLeft className="h-4 w-4" /> Cases
          </Button>
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
            <Badge variant={SLA_VARIANT[c.overall_sla_status] ?? 'secondary'}>
              {c.overall_sla_status?.replace('_', ' ')}
            </Badge>
          </div>
          <p className="mt-1 text-base font-semibold">{c.subject_name}</p>
          <p className="text-sm text-muted-foreground">
            {c.subject_position && `${c.subject_position} · `}{c.subject_ministry}
          </p>
        </div>

        {/* ── Action buttons — role-gated ── */}
        <div className="flex flex-wrap gap-2">
          {isActive && portalStatus === 'pending_manager' && p.canApprovePortal && (
            <>
              <Button size="sm" onClick={handleApprovePortal} disabled={portalBusy} className="gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Approve for Portal
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setShowReject(true)} disabled={portalBusy}>
                Reject
              </Button>
            </>
          )}
          {isActive && (portalStatus === 'draft' || portalStatus === 'rejected')
            && p.isComplianceSeniorPrincipal && c.portal_form_type_code && (
            <Button size="sm" variant="outline" onClick={handleSubmitForApproval} disabled={portalBusy}>
              Submit for Manager Approval
            </Button>
          )}
          {canRetryScdmsSync && (
            <Button size="sm" onClick={() => setShowRegisterPortal(true)} disabled={portalBusy} className="gap-1.5">
              <Send className="h-3.5 w-3.5" /> Retry sync to SCDMS
            </Button>
          )}
          {c.cdp_submission_id && (
            <Badge variant="info" className="self-center font-mono text-xs">
              CDP: {c.cdp_submission_id as string}
            </Badge>
          )}
          {p.canEditMetadata && (
            <Button size="sm" variant="outline" onClick={() => setShowEditMeta(true)} className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          )}
          {isActive && p.canRecordDecision && (
            <Button size="sm" variant="outline" onClick={() => setShowDecision(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Record Decision
            </Button>
          )}
          {isActive && p.canCloseCase && (
            <Button size="sm" variant="destructive" onClick={handleClose}>Close Case</Button>
          )}
          {isClosed && p.canReopenCase && (
            <Button size="sm" variant="outline" onClick={handleReopen} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> Reopen Case
            </Button>
          )}
        </div>
      </div>

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
      <Tabs defaultValue="overview">
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
            <DocumentsTab caseId={id} canUpload={p.canUploadDocs} canDelete={p.canDeleteDocs} />
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
    </div>
  )
}
