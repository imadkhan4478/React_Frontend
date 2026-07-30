import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ReportColumn, ReportRow } from './reportBuilder'

function toRows(rows: ReportRow[], columns: ReportColumn[]): string[][] {
  return rows.map((row) => columns.map((col) => col.text(row[col.key], row)))
}

export function exportExcel(rows: ReportRow[], columns: ReportColumn[], filename: string) {
  const header = columns.map((c) => c.label)
  const body = toRows(rows, columns)
  const sheet = XLSX.utils.aoa_to_sheet([header, ...body])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Report')
  XLSX.writeFile(workbook, filename)
}

export function exportPdf(rows: ReportRow[], columns: ReportColumn[], filename: string, title: string) {
  const doc = new jsPDF({ orientation: columns.length > 6 ? 'landscape' : 'portrait' })
  doc.setFontSize(13)
  doc.text(title, 14, 15)
  autoTable(doc, {
    head: [columns.map((c) => c.label)],
    body: toRows(rows, columns),
    startY: 20,
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [15, 23, 42] },
  })
  doc.save(filename)
}
