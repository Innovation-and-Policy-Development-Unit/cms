import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { casesAPI } from '@/api/ccms'
import { usePermissions } from '@/hooks/use-permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CASE_FAMILIES } from '@/lib/case-labels'

export { CASE_FAMILIES } from '@/lib/case-labels'

/* DG / Director can only create internal disciplinary and grievance cases */
const DG_ALLOWED_FAMILIES = new Set(['employee_disciplinary', 'grievance'])

const SENIOR_FAMILIES = new Set(['senior_serious_misconduct', 'senior_poor_performance'])

export const PORTAL_FORM_TYPES = [
  { value: 'COMP-SMDR', label: 'Staff Member Disciplinary Report (SMDR)' },
  { value: 'COMP-PAR', label: 'Preliminary Assessment Report' },
  { value: 'COMP-PSDB', label: 'PSDB Order on Determination' },
  { value: 'COMP-14D', label: 'Response to PSC 14 Days Notice' },
  { value: 'COMP-OMB', label: 'Ombudsman Request for Information' },
  { value: 'COMP-PSA', label: 'Proposed Amendment to Public Service Act' },
]

const EMPTY_FORM = {
  case_family: '',
  subject_name: '',
  subject_position: '',
  subject_ministry: '',
  is_senior_executive: false,
  date_received: new Date().toISOString().split('T')[0],
  description: '',
  portal_form_type_code: 'COMP-SMDR',
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: (id: string) => void
}

export function NewCaseDialog({ open, onOpenChange, onSuccess }: Props) {
  const qc = useQueryClient()
  const p = usePermissions()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  /* Restrict available families based on role */
  const availableFamilies = p.isDG
    ? CASE_FAMILIES.filter((f) => DG_ALLOWED_FAMILIES.has(f.value))
    : CASE_FAMILIES

  const set = (field: string, value: unknown) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleFamily = (value: string) => {
    set('case_family', value)
    set('is_senior_executive', SENIOR_FAMILIES.has(value))
  }

  const portalFormOptions = PORTAL_FORM_TYPES.filter(
    (f) => f.value !== 'COMP-PSA' || p.mayUsePsaForm,
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.case_family || !form.subject_name) return
    if (p.isCompliance && !form.portal_form_type_code) return
    setSaving(true)
    try {
      const { data } = await casesAPI.create(form as Record<string, unknown>)
      toast.success(`Case ${data.reference_number} created.`)
      qc.invalidateQueries({ queryKey: ['cases'] })
      onOpenChange(false)
      setForm(EMPTY_FORM)
      onSuccess?.(String(data.id))
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: unknown } })?.response?.data
      if (errData && typeof errData === 'object') {
        const msgs = Object.entries(errData as Record<string, unknown>)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' | ')
        toast.error(msgs)
      } else {
        toast.error('Failed to create case.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Case</DialogTitle>
          <DialogDescription>
            {p.isDG
              ? 'As DG / Director you may register Internal Disciplinary or Grievance cases for your Ministry.'
              : 'Selecting a case type automatically creates the correct workflow stages with statutory SLA deadlines.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Case Type *</Label>
            <Select value={form.case_family} onValueChange={handleFamily} required>
              <SelectTrigger><SelectValue placeholder="— Select Case Type —" /></SelectTrigger>
              <SelectContent>
                {availableFamilies.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
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

          {/* Senior executive flag — hidden for DG (they can't create senior cases) */}
          {!p.isDG && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox" id="senior"
                checked={form.is_senior_executive}
                onChange={(e) => set('is_senior_executive', e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="senior" className="font-normal cursor-pointer text-sm">
                Subject is a Senior Executive (DG, Director, Secretary General, Town Clerk, Auditor General)
              </Label>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Date Received *</Label>
            <Input type="date" value={form.date_received} onChange={(e) => set('date_received', e.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <Label>Description / Summary</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)}
              placeholder="Brief description of the allegation or issue…" />
          </div>

          {p.isCompliance && (
            <div className="space-y-1.5">
              <Label>Portal submission type (COMP-*) *</Label>
              <Select
                value={form.portal_form_type_code}
                onValueChange={(v) => set('portal_form_type_code', v)}
                required
              >
                <SelectTrigger><SelectValue placeholder="— Select type —" /></SelectTrigger>
                <SelectContent>
                  {portalFormOptions.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Senior and Principal cases require Manager approval before registering with the Commission Portal.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create Case & Generate Workflow'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
