import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useAuth } from './AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemedBackground } from '@/components/ThemedBackground'
import logo from '@/assets/qadri_logo_transparent.png'

export function LoginPage() {
  const { user, loading, login } = useAuth()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) {
    const redirectTo = (location.state as { from?: string } | null)?.from ?? '/dashboard'
    return <Navigate to={redirectTo} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(username, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-canvas via-canvas to-canvas-alt px-4">
      <ThemedBackground module="login" variant="hero" />

      <div className="animate-fade-in-up relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="animate-float-bob rounded-2xl bg-surface/70 p-3 shadow-lg ring-1 ring-line backdrop-blur">
            <img src={logo} alt="Qadri Group" className="h-14 w-14 object-contain" />
          </div>
          <div className="text-center">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-navy">QG-IRS</h1>
            <p className="text-sm font-semibold text-gold">Intelligent Reporting System</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-2xl border border-line/70 bg-surface/80 p-8 shadow-2xl backdrop-blur-xl"
        >
          <div className="mb-1 flex flex-col gap-1">
            <h2 className="font-display text-lg font-bold text-ink">Welcome back</h2>
            <p className="text-xs text-muted">Sign in to your supply-chain workspace</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="animate-scale-in rounded-lg bg-risk-bg px-3 py-2 text-sm text-risk">{error}</p>
          )}

          <Button type="submit" disabled={submitting} className="mt-2">
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>

          <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted">
            <ShieldCheck size={13} className="text-healthy" />
            Secure access · Qadri Group internal
          </p>
        </form>
      </div>
    </div>
  )
}
