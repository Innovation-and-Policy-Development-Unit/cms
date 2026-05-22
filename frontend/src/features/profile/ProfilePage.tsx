import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { User, Mail, Phone, Building2, Shield, AtSign } from 'lucide-react'
import { toast } from 'sonner'
import { authAPI } from '@/api/ccms'
import { useAuthStore, type AuthUser } from '@/stores/authStore'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

function formatRole(role: string) {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function initialsFrom(user: AuthUser | null) {
  if (!user) return '?'
  const fromName = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
  return fromName || user.username[0]?.toUpperCase() || '?'
}

export default function ProfilePage() {
  const qc = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)
  const storeUser = useAuthStore((s) => s.user)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [department, setDepartment] = useState('')

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => authAPI.me().then((r) => r.data as AuthUser & { last_login?: string | null; date_joined?: string }),
  })

  useEffect(() => {
    if (!profile) return
    setFirstName(profile.first_name ?? '')
    setLastName(profile.last_name ?? '')
    setEmail(profile.email ?? '')
    setPhone(profile.phone ?? '')
    setDepartment(profile.department ?? '')
  }, [profile])

  const saveMutation = useMutation({
    mutationFn: () =>
      authAPI.updateMe({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        department: department.trim(),
      }),
    onSuccess: async () => {
      const { data } = await authAPI.me()
      setUser(data as AuthUser)
      qc.invalidateQueries({ queryKey: ['profile', 'me'] })
      toast.success('Profile updated.')
    },
    onError: (err: unknown) => {
      const ax = err as { response?: { data?: Record<string, string | string[]> } }
      const body = ax.response?.data
      if (body && typeof body === 'object') {
        const first = Object.entries(body)[0]
        if (first) {
          const msg = Array.isArray(first[1]) ? first[1][0] : String(first[1])
          toast.error(msg)
          return
        }
      }
      toast.error('Could not save profile.')
    },
  })

  const displayName = profile
    ? `${profile.first_name} ${profile.last_name}`.trim() || profile.username
    : storeUser
      ? `${storeUser.first_name} ${storeUser.last_name}`.trim() || storeUser.username
      : ''

  const dirty =
    profile &&
    (firstName !== (profile.first_name ?? '') ||
      lastName !== (profile.last_name ?? '') ||
      email !== (profile.email ?? '') ||
      phone !== (profile.phone ?? '') ||
      department !== (profile.department ?? ''))

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!profile) {
    return <p className="text-center text-muted-foreground py-16">Could not load profile.</p>
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account details for the Compliance Case Management System
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                {initialsFrom(profile)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <CardTitle className="text-xl">{displayName}</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {profile.email}
                </span>
              </CardDescription>
              <Badge variant="secondary" className="capitalize">
                {formatRole(profile.role)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          {profile.last_login && (
            <p>Last sign-in: {new Date(profile.last_login).toLocaleString()}</p>
          )}
          {profile.date_joined && (
            <p>Member since: {new Date(profile.date_joined).toLocaleDateString()}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Personal information</CardTitle>
          </div>
          <CardDescription>Update your name and contact details</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              saveMutation.mutate()
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="first_name">First name</Label>
                <Input
                  id="first_name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last_name">Last name</Label>
                <Input
                  id="last_name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="phone"
                  className="pl-9"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+678 …"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="department">Department</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="department"
                  className="pl-9"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. IPDU"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={!dirty || saveMutation.isPending}
                onClick={() => {
                  setFirstName(profile.first_name ?? '')
                  setLastName(profile.last_name ?? '')
                  setEmail(profile.email ?? '')
                  setPhone(profile.phone ?? '')
                  setDepartment(profile.department ?? '')
                }}
              >
                Reset
              </Button>
              <Button type="submit" disabled={!dirty || saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Account</CardTitle>
          </div>
          <CardDescription>Managed by your system administrator</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Username</Label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9 bg-muted" value={profile.username} readOnly />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Role</Label>
            <Input className="bg-muted capitalize" value={formatRole(profile.role)} readOnly />
          </div>
          <Separator />
          <p className="text-xs text-muted-foreground">
            To change your password or role, contact an administrator via User Management.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
