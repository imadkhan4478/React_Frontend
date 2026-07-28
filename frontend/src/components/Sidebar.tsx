import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Moon, Sun, LogOut, PanelLeftClose, ChevronDown } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { useTheme } from '@/theme/ThemeContext'
import { pagesForRole } from '@/lib/roleAccess'
import { PAGE_DEFS, type PageDef } from '@/lib/pages'
import { cn } from '@/lib/utils'
import logo from '@/assets/qadri_logo_transparent.png'

/** Collapsible group entry — the sidebar's own analogue of SegmentedControl,
 * for a page whose two independent route trees don't fit as a single link.
 * Starts open only if you're already on one of its child routes. */
function GroupNavItem({ item }: { item: PageDef & { children: NonNullable<PageDef['children']> } }) {
  const { pathname } = useLocation()
  const childActive = item.children.some((c) => pathname === c.path || pathname.startsWith(c.path + '/'))
  const [expanded, setExpanded] = useState(childActive)
  const Icon = item.icon

  return (
    <div className="my-2 rounded-xl border border-line bg-canvas-alt/60 p-2">
      <button
        type="button"
        onClick={() => setExpanded((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1.5 text-sm font-semibold text-ink"
      >
        <span className="flex items-center gap-3">
          <Icon size={18} />
          {item.label}
        </span>
        <ChevronDown size={15} className={cn('text-muted transition-transform duration-200', expanded && 'rotate-180')} />
      </button>
      {expanded && (
        <div className="animate-fade-in-up mt-2 flex gap-1 rounded-lg bg-canvas p-1">
          {item.children.map((child) => (
            <NavLink
              key={child.path}
              to={child.path}
              className={({ isActive }) =>
                cn(
                  'flex-1 rounded-md px-2 py-1.5 text-center text-xs font-medium transition-colors',
                  isActive ? 'bg-brand text-white shadow-sm' : 'text-muted hover:bg-surface hover:text-ink',
                )
              }
            >
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar({ onHide }: { onHide: () => void }) {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const allowed = pagesForRole(user?.role)
  const visiblePages = PAGE_DEFS.filter((p) => allowed.includes(p.key))

  return (
    <aside className="relative flex h-screen w-64 shrink-0 flex-col border-r border-line bg-sidebar px-4 py-6">
      <button
        type="button"
        onClick={onHide}
        title="Hide sidebar"
        className="absolute right-3 top-3 rounded-lg p-1.5 text-muted hover:bg-canvas-alt hover:text-ink"
      >
        <PanelLeftClose size={16} />
      </button>

      <div className="flex flex-col items-center gap-2 pb-4">
        <img src={logo} alt="Qadri Group" className="h-12 w-12 object-contain" />
        <div className="text-center">
          <h2 className="font-display text-lg font-bold text-navy">QG-IRS</h2>
          <p className="text-xs font-semibold text-gold">Intelligent Reporting System</p>
        </div>
      </div>

      <button
        type="button"
        onClick={toggle}
        className="mb-4 flex items-center justify-center gap-2 rounded-lg border border-line py-2 text-sm text-ink hover:bg-canvas-alt"
      >
        {dark ? <Moon size={16} /> : <Sun size={16} />}
        {dark ? 'Dark mode' : 'Light mode'}
      </button>

      <nav className="flex flex-1 flex-col gap-1">
        {visiblePages.map((page) => {
          if (page.children) {
            return <GroupNavItem key={page.key} item={page as PageDef & { children: NonNullable<PageDef['children']> }} />
          }
          const Icon = page.icon
          return (
            <NavLink
              key={page.key}
              to={page.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-ink hover:bg-canvas-alt',
                )
              }
            >
              <Icon size={18} />
              {page.label}
            </NavLink>
          )
        })}
      </nav>

      {user && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-line px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
            <p className="truncate text-xs capitalize text-muted">{user.role}</p>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            title="Log out"
            className="shrink-0 rounded-lg p-2 text-muted hover:bg-canvas-alt hover:text-risk"
          >
            <LogOut size={16} />
          </button>
        </div>
      )}
    </aside>
  )
}
