import { useState } from 'react'
import { UserPlus, Pencil, X, Search, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/AuthContext'
import { listUsers, createUser, updateUserAccess } from '@/lib/mockAuth'
import { logActivity, getActivityLog } from '@/lib/activityLog'
import { PERMISSIONS, type Permission } from '@/lib/roleAccess'

/** The 5-item permission checklist, shared by the create form and the
 * per-account edit panel. Disabled (and dimmed) once "Make Admin" is
 * checked — an admin already sees everything, so the checklist stops
 * meaning anything until admin is unchecked again. */
function PermissionChecklist({
  value, onChange, disabled, idPrefix,
}: { value: Permission[]; onChange: (v: Permission[]) => void; disabled: boolean; idPrefix: string }) {
  function toggle(p: Permission) {
    onChange(value.includes(p) ? value.filter((v) => v !== p) : [...value, p])
  }
  return (
    <div className={disabled ? 'opacity-50' : ''}>
      <div className="flex flex-col gap-1.5">
        {PERMISSIONS.map((p) => (
          <label key={p.value} htmlFor={`${idPrefix}-${p.value}`} className="flex items-center gap-2 text-sm text-ink">
            <input
              id={`${idPrefix}-${p.value}`}
              type="checkbox"
              checked={value.includes(p.value)}
              onChange={() => toggle(p.value)}
              disabled={disabled}
              className="accent-brand"
            />
            {p.label}
          </label>
        ))}
      </div>
    </div>
  )
}

function AccessSummary({ isAdmin, permissions }: { isAdmin: boolean; permissions: Permission[] }) {
  if (isAdmin) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand">
        <ShieldCheck size={12} />
        Admin
      </span>
    )
  }
  if (permissions.length === 0) {
    return <span className="text-xs text-muted">No access</span>
  }
  return (
    <div className="flex flex-wrap justify-end gap-1">
      {permissions.map((p) => (
        <span key={p} className="rounded-full bg-canvas-alt px-2 py-0.5 text-[11px] font-medium text-muted">
          {PERMISSIONS.find((x) => x.value === p)?.label ?? p}
        </span>
      ))}
    </div>
  )
}

export function UserManagement() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState(() => listUsers())
  const [log, setLog] = useState(() => getActivityLog())
  const [logSearch, setLogSearch] = useState('')

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [editingUsername, setEditingUsername] = useState<string | null>(null)
  const [editIsAdmin, setEditIsAdmin] = useState(false)
  const [editPermissions, setEditPermissions] = useState<Permission[]>([])
  const [editError, setEditError] = useState<string | null>(null)

  function refresh() {
    setUsers(listUsers())
    setLog(getActivityLog())
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      createUser({ name, username, password, isAdmin, permissions })
      logActivity(me!.username, `Created account @${username} — ${isAdmin ? 'Admin' : permissions.length ? permissions.join(', ') : 'no permissions'}`)
      refresh()
      setName('')
      setUsername('')
      setPassword('')
      setIsAdmin(false)
      setPermissions([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the account')
    } finally {
      setSubmitting(false)
    }
  }

  function startEdit(u: { username: string; isAdmin: boolean; permissions: Permission[] }) {
    setEditingUsername(u.username)
    setEditIsAdmin(u.isAdmin)
    setEditPermissions(u.permissions)
    setEditError(null)
  }

  function saveEdit(username: string) {
    setEditError(null)
    try {
      updateUserAccess(username, { isAdmin: editIsAdmin, permissions: editPermissions })
      logActivity(me!.username, `Updated access for @${username} — ${editIsAdmin ? 'Admin' : editPermissions.length ? editPermissions.join(', ') : 'no permissions'}`)
      refresh()
      setEditingUsername(null)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Could not update this account')
    }
  }

  const filteredLog = logSearch.trim()
    ? log.filter((l) => `${l.actor} ${l.message}`.toLowerCase().includes(logSearch.trim().toLowerCase()))
    : log

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="User Management" subtitle="Create accounts and control who has access to what" module="userManagement" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <p className="mb-4 text-sm font-semibold text-ink">Accounts ({users.length})</p>
            <div className="flex flex-col">
              {users.map((u, i) => (
                <div key={u.username} className={`py-2.5 ${i !== 0 ? 'border-t border-line' : ''}`}>
                  {editingUsername === u.username ? (
                    <div className="flex flex-col gap-3 rounded-lg bg-canvas-alt p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-ink">
                          {u.name} <span className="text-xs text-muted">@{u.username}</span>
                        </p>
                        <button type="button" onClick={() => setEditingUsername(null)} className="text-muted hover:text-ink">
                          <X size={16} />
                        </button>
                      </div>
                      <label className="flex items-center gap-2 text-sm font-medium text-ink">
                        <input
                          type="checkbox"
                          checked={editIsAdmin}
                          onChange={(e) => setEditIsAdmin(e.target.checked)}
                          className="accent-brand"
                        />
                        Make Admin
                      </label>
                      <PermissionChecklist
                        idPrefix={`edit-${u.username}`}
                        value={editPermissions}
                        onChange={setEditPermissions}
                        disabled={editIsAdmin}
                      />
                      {editError && <p className="rounded-lg bg-risk-bg px-3 py-2 text-sm text-risk">{editError}</p>}
                      <Button type="button" onClick={() => saveEdit(u.username)} className="w-fit">
                        Save
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">
                          {u.name}
                          {u.username === me?.username && <span className="ml-1.5 text-xs text-muted">(you)</span>}
                        </p>
                        <p className="truncate text-xs text-muted">@{u.username}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <AccessSummary isAdmin={u.isAdmin} permissions={u.permissions} />
                        <button
                          type="button"
                          onClick={() => startEdit(u)}
                          title="Edit access"
                          className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-canvas-alt hover:text-ink"
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="p-5">
              <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-ink">
                <UserPlus size={15} />
                Create account
              </p>
              <p className="mb-4 text-xs text-muted">Only admins can create accounts.</p>
              <form onSubmit={handleCreate} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-name">Name</Label>
                  <Input id="new-name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-username">Username</Label>
                  <Input id="new-username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-password">Password</Label>
                  <Input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>

                <label className="flex items-center gap-2 text-sm font-medium text-ink">
                  <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} className="accent-brand" />
                  Make Admin
                </label>

                <div className="flex flex-col gap-1.5">
                  <Label>Permissions</Label>
                  <PermissionChecklist idPrefix="new" value={permissions} onChange={setPermissions} disabled={isAdmin} />
                </div>

                {error && <p className="animate-scale-in rounded-lg bg-risk-bg px-3 py-2 text-sm text-risk">{error}</p>}

                <Button type="submit" disabled={submitting} className="mt-1">
                  {submitting ? 'Creating…' : 'Create account'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <p className="mb-3 text-sm font-semibold text-ink">Activity Log</p>
              <div className="relative mb-3">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <Input
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Search by user or action…"
                  className="pl-8"
                />
              </div>
              <div className="flex max-h-80 flex-col gap-2.5 overflow-y-auto">
                {filteredLog.length === 0 && <p className="py-6 text-center text-sm text-muted">No activity yet.</p>}
                {filteredLog.map((entry) => (
                  <div key={entry.id} className="border-t border-line pt-2.5 first:border-t-0 first:pt-0">
                    <p className="text-xs text-ink">
                      <span className="font-semibold">@{entry.actor}</span> {entry.message}
                    </p>
                    <p className="text-[11px] text-muted">{new Date(entry.timestamp).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
