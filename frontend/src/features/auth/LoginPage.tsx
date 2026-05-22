import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { authAPI } from '@/api/ccms'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setTokens, setUser } = useAuthStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    useAuthStore.getState().logout()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) return
    setLoading(true)
    try {
      const { data } = await authAPI.login(username, password)
      setTokens(data.access, data.refresh)
      const { data: me } = await authAPI.me()
      setUser(me)
      navigate({ to: '/dashboard' })
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { detail?: string } }; message?: string }
      const detail = ax.response?.data?.detail
      if (detail) {
        toast.error(typeof detail === 'string' ? detail : 'Invalid username or password.')
      } else if (!ax.response) {
        toast.error('Cannot reach the API. Is the backend running on port 8001?')
      } else {
        toast.error('Invalid username or password.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <ShieldCheck className="h-10 w-10 text-primary" />
          <h1 className="text-2xl font-bold">CCMS</h1>
          <p className="text-sm text-muted-foreground">
            Compliance Case Management System
          </p>
          <p className="text-xs text-muted-foreground">
            Office of the Public Service Commission · Vanuatu
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sign in to your account</CardTitle>
            <CardDescription className="text-xs">Authorised access only</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  autoComplete="username"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
