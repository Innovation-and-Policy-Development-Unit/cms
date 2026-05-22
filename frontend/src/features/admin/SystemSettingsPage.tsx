import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Shield, Clock, Globe } from 'lucide-react'
import { toast } from 'sonner'
import { systemAPI } from '@/api/ccms'
import { AdminReferenceBanner } from '@/components/admin/AdminReferenceBanner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

interface Settings {
  organisation_name: string
  system_code: string
  sop_reference: string
  timezone_display: string
  sla_at_risk_days: number
  sla_critical_days: number
  system_email: string
  admin_notification_email: string
  access_token_lifetime: string
  refresh_token_lifetime: string
  updated_at?: string
}

export default function SystemSettingsPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => systemAPI.getSettings().then((r) => r.data as Settings),
  })

  const [form, setForm] = useState<Settings | null>(null)

  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  const save = useMutation({
    mutationFn: (payload: Partial<Settings>) => systemAPI.updateSettings(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system-settings'] })
      toast.success('System settings saved.')
    },
    onError: () => toast.error('Could not save settings.'),
  })

  const set = (key: keyof Settings, value: string | number) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const dirty =
    form &&
    data &&
    (form.organisation_name !== data.organisation_name ||
      form.system_code !== data.system_code ||
      form.sop_reference !== data.sop_reference ||
      form.sla_at_risk_days !== data.sla_at_risk_days ||
      form.sla_critical_days !== data.sla_critical_days ||
      form.system_email !== data.system_email ||
      form.admin_notification_email !== data.admin_notification_email)

  if (isLoading || !form) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
        <p className="text-sm text-muted-foreground">
          Organisation defaults and SLA alert thresholds (stored in the database)
        </p>
        {data.updated_at && (
          <p className="text-xs text-muted-foreground mt-1">
            Last saved: {new Date(data.updated_at).toLocaleString()}
          </p>
        )}
      </div>

      <AdminReferenceBanner title="Configurable in CMS">
        Organisation name, SLA thresholds, and notification emails are saved via the API.
        JWT session lifetimes and Django timezone remain environment-controlled (read-only below).
      </AdminReferenceBanner>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Organisation</CardTitle>
          </div>
          <CardDescription>Displayed in headers and reports</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Organisation name</Label>
            <Input
              value={form.organisation_name}
              onChange={(e) => set('organisation_name', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>System code</Label>
              <Input value={form.system_code} onChange={(e) => set('system_code', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>SOP reference</Label>
              <Input value={form.sop_reference} onChange={(e) => set('sop_reference', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Timezone (display)</Label>
            <Input value={form.timezone_display} readOnly className="bg-muted" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">SLA alert thresholds</CardTitle>
          </div>
          <CardDescription>Used when flagging case stages as at risk or overdue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>At-risk warning (days before deadline)</Label>
              <Input
                type="number"
                min={1}
                value={form.sla_at_risk_days}
                onChange={(e) => set('sla_at_risk_days', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Critical alert (days before deadline)</Label>
              <Input
                type="number"
                min={1}
                value={form.sla_critical_days}
                onChange={(e) => set('sla_critical_days', Number(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Notification defaults</CardTitle>
          </div>
          <CardDescription>For future email integration; in-app notifications use the live feed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>System email (sender)</Label>
            <Input
              type="email"
              value={form.system_email}
              onChange={(e) => set('system_email', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Admin notification email</Label>
            <Input
              type="email"
              value={form.admin_notification_email}
              onChange={(e) => set('admin_notification_email', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Security & session</CardTitle>
          </div>
          <CardDescription>Managed in server configuration — not editable here</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Access token lifetime</Label>
              <Input value={form.access_token_lifetime} readOnly className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label>Refresh token lifetime</Label>
              <Input value={form.refresh_token_lifetime} readOnly className="bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!dirty || save.isPending}
          onClick={() => data && setForm(data)}
        >
          Reset
        </Button>
        <Button
          disabled={!dirty || save.isPending}
          onClick={() => save.mutate(form)}
        >
          {save.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  )
}
