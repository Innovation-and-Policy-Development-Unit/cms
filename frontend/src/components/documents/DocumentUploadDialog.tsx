import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'
import { casesAPI, documentsAPI } from '@/api/ccms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const DOCUMENT_TYPES = [
  { value: 'investigation_report', label: 'Investigation Report' },
  { value: 'show_cause_notice', label: 'Show Cause Notice' },
  { value: 'allegation_letter', label: 'Allegation Letter' },
  { value: 'warning_letter', label: 'Warning Letter' },
  { value: 'committee_minutes', label: 'Committee Minutes' },
  { value: 'outcome_letter', label: 'Outcome Letter' },
  { value: 'submission', label: 'Submission' },
  { value: 'evidence', label: 'Evidence' },
  { value: 'other', label: 'Other' },
] as const

export function DocumentUploadDialog({
  open,
  onOpenChange,
  /** When set, case is fixed and hidden (case detail upload). */
  caseId,
  caseLabel,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  caseId?: string
  caseLabel?: string
}) {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    doc_type: 'other',
    case: caseId ?? '',
  })

  const { data: caseOptions } = useQuery({
    queryKey: ['cases', 'upload-picker'],
    queryFn: () =>
      casesAPI.list({ status: 'active', page_size: 100 }).then((r) => {
        const rows = (r.data?.results ?? r.data ?? []) as Record<string, unknown>[]
        return rows
      }),
    enabled: open && !caseId,
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!form.title) setForm((p) => ({ ...p, title: file.name.replace(/\.[^.]+$/, '') }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    const linkedCase = caseId ?? form.case
    if (!file) {
      toast.error('Please select a file.')
      return
    }
    if (!linkedCase) {
      toast.error('Select the case this document belongs to.')
      return
    }
    const fd = new FormData()
    fd.append('file', file)
    fd.append('title', form.title || file.name)
    fd.append('doc_type', form.doc_type)
    fd.append('case', linkedCase)
    setUploading(true)
    try {
      await documentsAPI.upload(fd)
      qc.invalidateQueries({ queryKey: ['documents'] })
      if (linkedCase) {
        qc.invalidateQueries({ queryKey: ['documents', { case: linkedCase }] })
      }
      toast.success('Document uploaded.')
      onOpenChange(false)
      setForm({ title: '', doc_type: 'other', case: caseId ?? '' })
      if (fileRef.current) fileRef.current.value = ''
    } catch {
      toast.error('Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
          <DialogDescription>
            {caseId
              ? `File will be attached to ${caseLabel ?? `case #${caseId}`}.`
              : 'All uploads must be linked to a case (cross-case registry).'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!caseId && (
            <div className="space-y-1.5">
              <Label>Case *</Label>
              <Select
                value={form.case || '__none__'}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, case: v === '__none__' ? '' : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select case…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select case…</SelectItem>
                  {(caseOptions ?? []).map((c) => (
                    <SelectItem key={c.id as number} value={String(c.id)}>
                      {(c.reference_number as string) ?? c.id} — {c.subject_name as string}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>File *</Label>
            <input
              ref={fileRef}
              type="file"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border file:border-input file:bg-card file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-muted"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Document title…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Document type</Label>
            <Select
              value={form.doc_type}
              onValueChange={(v) => setForm((p) => ({ ...p, doc_type: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploading} className="gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
