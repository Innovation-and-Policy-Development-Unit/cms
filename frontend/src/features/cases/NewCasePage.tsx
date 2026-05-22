import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { casesAPI } from '@/api/ccms'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const FAMILIES = [
  { value: 'employee_disciplinary', label: 'Employee Internal Disciplinary' },
  { value: 'serious_misconduct_employee', label: 'Serious Misconduct — Employee' },
  { value: 'temporary_suspension', label: 'Temporary Suspension' },
  { value: 'grievance', label: 'Grievance Process' },
  { value: 'senior_serious_misconduct', label: 'Senior Executive — Serious Misconduct' },
  { value: 'senior_poor_performance', label: 'Senior Executive — Poor Performance' },
]

const SENIOR_FAMILIES = new Set(['senior_serious_misconduct', 'senior_poor_performance'])

export default function NewCasePage() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    case_family: '',
    subject_name: '',
    subject_position: '',
    subject_ministry: '',
    is_senior_executive: false,
    date_received: new Date().toISOString().split('T')[0],
    description: '',
  })

  const set = (field: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleFamily = (value: string) => {
    set('case_family', value)
    if (SENIOR_FAMILIES.has(value)) set('is_senior_executive', true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.case_family || !form.subject_name) return
    setSaving(true)
    try {
      const { data } = await casesAPI.create(form as Record<string, unknown>)
      toast.success(`Case ${data.reference_number} created successfully.`)
      navigate({ to: '/cases/$id', params: { id: String(data.id) } })
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: unknown } })?.response?.data
      if (errData && typeof errData === 'object') {
        const msgs = Object.entries(errData).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
        toast.error(msgs)
      } else {
        toast.error('Failed to create case.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Case</h1>
        <p className="text-sm text-muted-foreground">
          Selecting a case type automatically creates the correct workflow stages with statutory SLA deadlines.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Case Details</CardTitle>
          <CardDescription>All fields marked * are required.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Case Type *</Label>
              <Select onValueChange={handleFamily} required>
                <SelectTrigger>
                  <SelectValue placeholder="— Select Case Type —" />
                </SelectTrigger>
                <SelectContent>
                  {FAMILIES.map((f) => (
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

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="senior"
                checked={form.is_senior_executive}
                onChange={(e) => set('is_senior_executive', e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="senior" className="font-normal cursor-pointer">
                Subject is a Senior Executive (DG, Director, Secretary General, Town Clerk, Auditor General)
              </Label>
            </div>

            <div className="space-y-1.5">
              <Label>Date Received *</Label>
              <Input type="date" value={form.date_received} onChange={(e) => set('date_received', e.target.value)} required />
            </div>

            <div className="space-y-1.5">
              <Label>Description / Summary</Label>
              <Textarea
                rows={4}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Brief description of the allegation or issue…"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate({ to: '/cases' })}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Creating…' : 'Create Case & Generate Workflow'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
