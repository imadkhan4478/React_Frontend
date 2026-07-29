import type { PageKey } from '@/theme/tokens'

/**
 * No more roles — every account is either an Admin (sees and can do
 * everything, including managing other accounts) or a regular account
 * whose visibility is whatever's checked in its permission list. Admin
 * status is a separate flag, not one of the checkboxes, so a permission
 * edit can never accidentally grant/revoke User Management access.
 */
export type Permission = 'assistant' | 'dashboards' | 'operationsEdit' | 'operationsViewOnly' | 'reports'

export const PERMISSIONS: { value: Permission; label: string }[] = [
  { value: 'assistant', label: 'Assistant' },
  { value: 'dashboards', label: 'Dashboards' },
  { value: 'operationsEdit', label: 'Operations — Edit' },
  { value: 'operationsViewOnly', label: 'Operations — View Only' },
  { value: 'reports', label: 'Customize Reports' },
]

/** The minimal shape every access check needs. Real `User` objects
 * (AuthContext) and in-progress edit-form state both satisfy this. */
export interface Access {
  isAdmin: boolean
  permissions: Permission[]
}

const ALL_PAGES: PageKey[] = ['assistant', 'dashboard', 'reports', 'dataEntry', 'userManagement']

// Both Operations permissions grant the same page — the edit/view-only
// distinction is enforced by `can()`, not by which pages are visible.
const PERMISSION_PAGE: Record<Permission, PageKey> = {
  assistant: 'assistant',
  dashboards: 'dashboard',
  operationsEdit: 'dataEntry',
  operationsViewOnly: 'dataEntry',
  reports: 'reports',
}

/**
 * Pages this account can see. This is a UI-only gate (hide/redirect away
 * from pages an account shouldn't see, including direct URL access) — the
 * backend team owns real authorization.
 */
export function pagesForUser(access: Access | null | undefined): PageKey[] {
  if (!access) return []
  if (access.isAdmin) return ALL_PAGES
  return [...new Set(access.permissions.map((p) => PERMISSION_PAGE[p]))]
}

/**
 * Actions from the permission matrix (README) — components ask `can(user,
 * action)` instead of branching on role/permission strings directly:
 *  - enter: create a brand-new record (e.g. start the Imports Status wizard)
 *  - editAny: edit any existing record, unrestricted
 *  - editOwnDraft: edit existing records, but only your own drafts (kept
 *    for callers that still check it; nothing currently grants it — see
 *    `can()` below)
 *  - viewReports: view the Reports page (read-only is fine — nothing
 *    financial is hidden)
 *  - manageUsers: create/edit user accounts
 *  - manageMastersFull: full CRUD on master data (suppliers, items, etc.)
 *  - manageMastersInlineCreate: create master-data entries inline (e.g. a
 *    dropdown's "+ add new") without full masters management access
 */
export type Action =
  | 'enter'
  | 'editAny'
  | 'editOwnDraft'
  | 'viewReports'
  | 'manageUsers'
  | 'manageMastersFull'
  | 'manageMastersInlineCreate'

/** Admins can do everything. Otherwise every action is derived straight
 * from the permission checklist: `operationsEdit` grants entry/edit
 * capability in Operations, `operationsViewOnly` grants none of it
 * (read-only), `reports` grants report viewing. Account/masters
 * administration stays admin-only. */
export function can(access: Access | null | undefined, action: Action): boolean {
  if (!access) return false
  if (access.isAdmin) return true
  switch (action) {
    case 'enter':
    case 'editAny':
    case 'manageMastersInlineCreate':
      return access.permissions.includes('operationsEdit')
    case 'viewReports':
      return access.permissions.includes('reports')
    case 'editOwnDraft':
    case 'manageUsers':
    case 'manageMastersFull':
      return false
  }
}
