import type { PageKey } from '@/theme/tokens'

export const ALL_PAGES: PageKey[] = [
  'dashboard', 'purchases', 'inventory', 'imports', 'logistics', 'reports', 'assistant',
]

/**
 * Role -> allowed page keys. A role not listed here (or an empty/missing
 * mapping) gets every page. The real per-role restrictions are a business
 * decision not yet made — this is the one place to edit once they are,
 * mirroring app.py's old `PAGES` dict convention: change it here, nothing
 * else in the app needs to know about roles.
 */
const PAGE_ACCESS: Partial<Record<string, PageKey[]>> = {}

export function pagesForRole(role: string | undefined): PageKey[] {
  if (!role) return ALL_PAGES
  return PAGE_ACCESS[role] ?? ALL_PAGES
}
