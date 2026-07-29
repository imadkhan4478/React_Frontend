import {
  Gauge, ClipboardList, BarChart3, MessageSquare, Users,
  type LucideIcon,
} from 'lucide-react'
import type { PageKey } from '@/theme/tokens'
import { pagesForRole } from './roleAccess'

export interface PageDef {
  key: PageKey
  label: string
  path: string
  icon: LucideIcon
  /** Sub-links rendered under this item instead of it being a direct link
   * itself — used for Operations, which groups two independent route trees
   * (Imports Status, Logistics Status) behind one sidebar entry. */
  children?: { label: string; path: string }[]
}

// Single source of truth for the sidebar/routes — mirrors the old
// Streamlit `PAGES` dict in app.py: to reorder/rename a tab, edit here only.
// Purchases/Inventory/Imports/Logistics aren't separate entries — they live
// as tabs inside Dashboard (see Dashboard.tsx's own tab bar).
export const PAGE_DEFS: PageDef[] = [
  { key: 'assistant', label: 'Assistant', path: '/assistant', icon: MessageSquare },
  { key: 'dashboard', label: 'Dashboards', path: '/dashboard', icon: Gauge },
  { key: 'reports', label: 'Customize Reports', path: '/reports', icon: BarChart3 },
  // Kept separate from the reporting pages above (its own section in the
  // sidebar, not interleaved between them) — a different kind of work.
  {
    key: 'dataEntry', label: 'Operations', path: '/imports-status', icon: ClipboardList,
    children: [
      { label: 'Imports Status', path: '/imports-status' },
      { label: 'Logistics Status', path: '/logistics-status' },
    ],
  },
  { key: 'userManagement', label: 'User Management', path: '/user-management', icon: Users },
]

/** Where to land a given role right after login (or when they're bounced
 * off a page they can't access) — the first page in PAGE_DEFS order that
 * their role is allowed to see. */
export function defaultPathForRole(role: string | undefined): string {
  const allowed = pagesForRole(role)
  const first = PAGE_DEFS.find((p) => allowed.includes(p.key))
  return first?.path ?? '/login'
}
