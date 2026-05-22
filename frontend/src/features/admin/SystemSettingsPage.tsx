import { Bell, Shield, Clock, Globe } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export default function SystemSettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
        <p className="text-sm text-muted-foreground">General system configuration and notification preferences</p>
      </div>

      {/* Organisation */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Organisation</CardTitle>
          </div>
          <CardDescription>Basic system identity settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Organisation Name</Label>
            <Input defaultValue="Office of the Public Service Commission" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>System Code</Label>
              <Input defaultValue="CCMS" />
            </div>
            <div className="space-y-1.5">
              <Label>SOP Reference</Label>
              <Input defaultValue="IPDU-SOP-001" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <Input defaultValue="Pacific/Efate (UTC+11)" readOnly className="bg-muted" />
          </div>
        </CardContent>
      </Card>

      {/* SLA Defaults */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">SLA Alert Thresholds</CardTitle>
          </div>
          <CardDescription>When to flag cases as At Risk before the deadline is reached</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>At-Risk Warning (days before deadline)</Label>
              <Input type="number" defaultValue={3} min={1} />
            </div>
            <div className="space-y-1.5">
              <Label>Critical Alert (days before deadline)</Label>
              <Input type="number" defaultValue={1} min={1} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Notification Settings</CardTitle>
          </div>
          <CardDescription>System-wide email and in-app notification configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>System Email (sender)</Label>
            <Input type="email" defaultValue="no-reply@opsc.gov.vu" />
          </div>
          <div className="space-y-1.5">
            <Label>Admin Notification Email</Label>
            <Input type="email" defaultValue="ipdu@opsc.gov.vu" />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Security & Session</CardTitle>
          </div>
          <CardDescription>Token lifetimes and access control</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Access Token Lifetime</Label>
              <Input defaultValue="8 hours" readOnly className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label>Refresh Token Lifetime</Label>
              <Input defaultValue="7 days" readOnly className="bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end">
        <Button disabled>Save Changes</Button>
      </div>
    </div>
  )
}
