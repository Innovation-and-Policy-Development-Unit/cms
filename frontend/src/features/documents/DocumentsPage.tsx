import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Upload, Trash2, FileText, Search, Eye, Download, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { documentsAPI } from '@/api/ccms'
import { usePermissions } from '@/hooks/use-permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

const DOC_TYPES = [
  { value: 'investigation_report', label: 'Investigation Report' },
  { value: 'show_cause_notice',    label: 'Show Cause Notice' },
  { value: 'allegation_letter',    label: 'Allegation Letter' },
  { value: 'warning_letter',       label: 'Warning Letter' },
  { value: 'committee_minutes',    label: 'Committee Minutes' },
  { value: 'outcome_letter',       label: 'Outcome Letter' },
  { value: 'submission',           label: 'Submission' },
  { value: 'evidence',             label: 'Evidence' },
  { value: 'other',                label: 'Other' },
]

const DOC_TYPE_LABEL: Record<string, string> = Object.fromEntries(DOC_TYPES.map((d) => [d.value, d.label]))

/* ─── Upload Dialog ──────────────────────────────────────────── */
function UploadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ title: '', doc_type: 'other' })

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!form.title) setForm((p) => ({ ...p, title: file.name.replace(/\.[^.]+$/, '') }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) { toast.error('Please select a file.'); return }
    const fd = new FormData()
    fd.append('file', file)
    fd.append('title', form.title || file.name)
    fd.append('doc_type', form.doc_type)
    setUploading(true)
    try {
      await documentsAPI.upload(fd)
      qc.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Document uploaded.')
      onOpenChange(false)
      setForm({ title: '', doc_type: 'other' })
      if (fileRef.current) fileRef.current.value = ''
    } catch { toast.error('Upload failed.') }
    finally { setUploading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>File *</Label>
            <input ref={fileRef} type="file" onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border file:border-input file:bg-card file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-muted" />
          </div>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Document title…" />
          </div>
          <div className="space-y-1.5">
            <Label>Document Type</Label>
            <Select value={form.doc_type} onValueChange={(v) => setForm((p) => ({ ...p, doc_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={uploading} className="gap-1.5">
              <Upload className="h-3.5 w-3.5" /> {uploading ? 'Uploading…' : 'Upload'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function DocumentsPage() {
  const qc = useQueryClient()
  const p = usePermissions()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [q, setQ] = useState('')
  const [docTypeFilter, setDocTypeFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsAPI.list().then((r) => r.data),
  })

  const allDocs: Record<string, unknown>[] = data?.results ?? data ?? []

  const docs = allDocs.filter((d) => {
    const matchQ = !q || `${d.title} ${d.case} ${d.uploaded_by_name}`.toLowerCase().includes(q.toLowerCase())
    const matchType = !docTypeFilter || d.doc_type === docTypeFilter
    return matchQ && matchType
  })

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this document?')) return
    await documentsAPI.delete(id)
    qc.invalidateQueries({ queryKey: ['documents'] })
    toast.success('Document deleted.')
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-sm text-muted-foreground">Central repository for all case-related documents</p>
        </div>
        {p.canUploadDocs && (
          <Button onClick={() => setUploadOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" /> Upload Document
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents, cases, uploader…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={docTypeFilter || '__all__'} onValueChange={(v) => setDocTypeFilter(v === '__all__' ? '' : v)}>
          <SelectTrigger className="h-9 w-[200px]">
            <Filter className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Document Types</SelectItem>
            {DOC_TYPES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File Name</TableHead>
                <TableHead>Document Type</TableHead>
                <TableHead>Case Reference</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Size</TableHead>
                {(p.canUploadDocs || p.canDeleteDocs) && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: p.canDeleteDocs ? 7 : 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : docs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={p.canDeleteDocs ? 7 : 6} className="py-16 text-center text-muted-foreground">
                    <FileText className="mx-auto mb-2 h-10 w-10 opacity-20" />
                    <p className="font-medium">No documents found</p>
                    <p className="text-xs mt-1">
                      {p.canUploadDocs ? 'Upload a document or adjust filters' : 'No documents available'}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                docs.map((d) => (
                  <TableRow key={d.id as number}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-primary" />
                        <span className="font-medium">{d.title as string}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {DOC_TYPE_LABEL[d.doc_type as string] ?? (d.doc_type as string)?.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {(d.case_reference as string) || (d.case as string) || '—'}
                    </TableCell>
                    <TableCell className="text-xs">{(d.uploaded_by_name as string) ?? '—'}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {(d.uploaded_at as string)?.split('T')[0]}
                    </TableCell>
                    <TableCell className="text-xs">
                      {d.file_size ? `${Math.round((d.file_size as number) / 1024)} KB` : '—'}
                    </TableCell>
                    {(p.canUploadDocs || p.canDeleteDocs) && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" disabled title="View">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" disabled title="Download">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          {p.canDeleteDocs && (
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(d.id as number)} title="Delete">
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  )
}
