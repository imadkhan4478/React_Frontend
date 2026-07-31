/**
 * "Static" reports — a saved column/filter template a user can re-download
 * anytime with fresh data, instead of re-picking the same Data/Item/Supplier/
 * etc. selections every time. Deliberately excludes date range: a frozen
 * date window would go stale (or shrink to nothing) the longer a template
 * sits around — every download re-pulls whatever's current.
 *
 * localStorage until the real backend lands, same as mockAuth/activityLog.
 * Visible to anyone who can reach Reports (not just the creator) — the
 * whole point is "some user only download this report."
 */

import type { ReportType, ReportFilters } from './reportBuilder'

export interface SavedReport {
  id: string
  name: string
  createdBy: string
  createdAt: number
  types: ReportType[]
  columns: string[]
  filters: ReportFilters
}

const KEY = 'qgirs-saved-reports-v1'

function load(): SavedReport[] {
  const raw = window.localStorage.getItem(KEY)
  return raw ? (JSON.parse(raw) as SavedReport[]) : []
}

function save(reports: SavedReport[]) {
  window.localStorage.setItem(KEY, JSON.stringify(reports))
}

export function getSavedReports(): SavedReport[] {
  return load().sort((a, b) => b.createdAt - a.createdAt)
}

export function createSavedReport(input: Omit<SavedReport, 'id' | 'createdAt'>): SavedReport {
  const report: SavedReport = { ...input, id: crypto.randomUUID(), createdAt: Date.now() }
  const reports = load()
  reports.push(report)
  save(reports)
  return report
}

export function deleteSavedReport(id: string): void {
  save(load().filter((r) => r.id !== id))
}

/** Overwrites an existing template's definition in place (same id, same
 * createdAt) — the "Edit" path, as opposed to createSavedReport's "Save as
 * new". Name/creator can change too, e.g. editing someone else's template
 * to Save-as-New under your own name first. */
export function updateSavedReport(id: string, updates: Omit<SavedReport, 'id' | 'createdAt'>): void {
  const reports = load()
  const target = reports.find((r) => r.id === id)
  if (!target) throw new Error('Saved report not found')
  Object.assign(target, updates)
  save(reports)
}
