import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/AuthContext'
import { can } from '@/lib/roleAccess'
import {
  WIZARD_STEPS, daysBetween,
  totalQuantity, totalNetWeight, totalGrossWeight, ratePerWeight, exportNumbers,
} from './schema'
import { getLogisticsOrder } from '@/lib/logisticsStatusData'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const dateShort = (v?: string) => {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(+d)) return '—'
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
}
const num = (v: number) => v.toLocaleString('en-US')
const pkr = (v: number | undefined) => (v === undefined || v === 0 ? '—' : `PKR ${Math.round(v).toLocaleString('en-US')}`)
const daysFmt = (n: number | null) => (n === null ? '—' : n <= 0 ? 'on time' : `+${n} d`)

const EXPORT_COSTS: { name: string; label: string }[] = [
  { name: 'packingCost', label: 'Packing Cost' },
  { name: 'insurance', label: 'Insurance' },
  { name: 'truckingLhrToKhi', label: 'Trucking (Lhr → Khi / QFL)' },
  { name: 'fumigationCost', label: 'Fumigation Cost' },
  { name: 'lashing', label: 'Lashing' },
  { name: 'qflCharges', label: 'QFL Charges' },
  { name: 'qflContainerMovement', label: 'QFL Transportation (Port → QFL → Port)' },
  { name: 'customClearanceCharges', label: 'Custom Clearance Charges' },
  { name: 'portCharges', label: 'Port Charges' },
  { name: 'dhlCharges', label: 'DHL Charges' },
  { name: 'seaAirFreight', label: 'Sea Freight / Air Freight' },
]
const LOCAL_COSTS: { name: string; label: string }[] = [
  { name: 'packingCost', label: 'Packing Cost' },
  { name: 'transportationCharges', label: 'Transportation Charges' },
]

/**
 * Logistics Status — detail view.
 *
 * All five modules for one order, read-only, on a single page — same purpose
 * as ImportsStatusDetail: this is where a manager actually looks things up,
 * the wizard is for entry. Items and containers get their own tables since an
 * order can carry several of each, with export numbers shown per item since
 * they can legitimately differ within one order.
 */
export default function LogisticsStatusDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const row = useMemo(() => (id ? getLogisticsOrder(id) : undefined), [id])
  const editable = can(user, 'editAny') || can(user, 'editOwnDraft')

  if (!row) {
    return (
      <div className="space-y-4">
        <PageHeader title="Logistics order not found" module="logisticsStatus" />
        <button onClick={() => navigate('/logistics-status')} className="text-sm text-brand hover:underline">
          ← Back to logistics orders
        </button>
      </div>
    )
  }

  const isExport = row.orderType === 'Export'
  const costs = isExport ? EXPORT_COSTS : LOCAL_COSTS
  const costTotal = costs.reduce((s, c) => s + (Number((row as unknown as Record<string, number>)[c.name]) || 0), 0)

  const qty = totalQuantity(row.items)
  const netW = totalNetWeight(row.items)
  const grossW = totalGrossWeight(row.items)
  const rate = ratePerWeight(row.actualFreight, row.items)
  const exportNos = exportNumbers(row.items)
  const transportDelay = daysBetween(row.dispatchNoteDate, row.gateOutDate)
  const arrivalDelay = daysBetween(row.croArrivalDate, row.actualArrivalDate)

  const EditLink = ({ step }: { step: string }) => {
    if (!editable) return null
    return (
      <button onClick={() => navigate(`/logistics-status/${row.systemId}/edit/${step}`)} className="ml-auto text-xs text-brand hover:underline">
        Edit
      </button>
    )
  }

  return (
    <div className="space-y-4 pb-16">
      <div className="text-xs text-muted">
        <button onClick={() => navigate('/logistics-status')} className="hover:underline">Logistics Status</button>
        {' › '}{row.systemId}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader
          title={row.systemId}
          subtitle={`${row.customerName} · ${row.orderType} · ${row.items.length} item${row.items.length === 1 ? '' : 's'}`}
          module="logisticsStatus"
        />
        <div className="flex items-center gap-3">
          <StatusBadge label={row.status} />
          <Button variant="outline" onClick={() => window.print()}>Export PDF</Button>
          {editable && (
            <Button asChild>
              <a href="#" onClick={(e) => { e.preventDefault(); navigate(`/logistics-status/${row.systemId}/edit/order`) }}>
                Edit order
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* key figures */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
        <KeyFigure label="Total quantity" value={num(qty)} sub={`${row.items.length} item line${row.items.length === 1 ? '' : 's'}`} />
        <KeyFigure label="Total weight" value={`${num(grossW)} kg`} sub={`${num(netW)} kg net`} />
        <KeyFigure label="Freight" value={pkr(row.actualFreight)} sub={rate !== null ? `${rate.toFixed(2)} /kg` : 'Rate needs freight + weight'} />
        <KeyFigure label="Containers" value={row.containers.length ? String(row.containers.length) : '—'} sub={row.containers.length ? [...new Set(row.containers.map((c) => c.containerType))].join(', ') : 'None yet'} />
        <KeyFigure label="Expenditure" value={pkr(costTotal || undefined)} sub={`${costs.length} cost line${costs.length === 1 ? '' : 's'} tracked`} />
        {isExport && (
          <KeyFigure label="Export no(s)." value={exportNos.length ? String(exportNos.length) : '—'} sub={exportNos.length <= 1 ? (exportNos[0] ?? 'Not yet entered') : `${exportNos.length} distinct`} warn={exportNos.length === 0} />
        )}
      </div>

      {/* section nav */}
      <nav className="sticky top-14 z-10 flex gap-1 overflow-x-auto rounded-lg border border-line bg-surface p-1">
        {WIZARD_STEPS.map((s) => (
          <a key={s.key} href={`#s-${s.key}`} className="flex-1 whitespace-nowrap rounded px-3 py-1.5 text-center text-xs text-muted hover:bg-canvas-alt hover:text-ink">
            {s.label}
          </a>
        ))}
      </nav>

      {/* 1 — order */}
      <Section id="s-order" title="Order details" edit={<EditLink step="order" />}>
        <FieldGrid>
          <Field label="Order type" value={row.orderType} />
          <Field label="Customer" value={row.customerName} span={2} />
          <Field label="Origin" value={isExport ? row.originCountry : `${row.originCity}, ${row.originProvince}`} />
        </FieldGrid>

        <div className="mt-4 overflow-auto rounded-lg border border-line">
          <table className="w-full text-sm">
            <thead className="bg-canvas-alt text-xs text-muted">
              <tr>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-right">Quantity</th>
                <th className="px-3 py-2 text-right">Net wt (kg)</th>
                <th className="px-3 py-2 text-right">Gross wt (kg)</th>
                <th className="px-3 py-2 text-left">IDM</th>
                {isExport && <th className="px-3 py-2 text-left">Export no.</th>}
                <th className="px-3 py-2 text-left">Batch</th>
              </tr>
            </thead>
            <tbody>
              {row.items.map((it, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="px-3 py-2">{it.itemDetail || <span className="italic text-muted">Not named</span>}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{it.quantity !== undefined ? num(it.quantity) : '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{it.netWeight !== undefined ? num(it.netWeight) : '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{it.grossWeight !== undefined ? num(it.grossWeight) : '—'}</td>
                  <td className="px-3 py-2 tabular-nums">{it.idm || '—'}</td>
                  {isExport && (
                    <td className="px-3 py-2 tabular-nums">
                      {it.exportNo || <span className="rounded border border-[var(--color-watch)]/30 bg-[var(--color-watch-bg)] px-1.5 py-0.5 text-[11px] text-[var(--color-watch)]">Missing</span>}
                    </td>
                  )}
                  <td className="px-3 py-2 text-muted">{it.batchNo || '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-line font-semibold">
                <td className="px-3 py-2">Total</td>
                <td className="px-3 py-2 text-right tabular-nums">{num(qty)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{num(netW)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{num(grossW)}</td>
                <td colSpan={isExport ? 3 : 2} />
              </tr>
            </tfoot>
          </table>
        </div>
        {isExport && exportNos.length > 1 && (
          <p className="mt-2 text-xs text-muted">This order's items are filed under {exportNos.length} different export numbers.</p>
        )}
      </Section>

      {/* 2 — transportation */}
      <Section id="s-transportation" title="Transportation" edit={<EditLink step="transportation" />}>
        <FieldGrid>
          <Field label="Transporter" value={row.transporterName} />
          <Field label="Vehicle type" value={row.vehicleType} />
          <Field label="Dispatch note date" value={dateShort(row.dispatchNoteDate)} mono />
          <Field label="Gate out date" value={dateShort(row.gateOutDate)} mono />
          <Field label="Delay" value={daysFmt(transportDelay)} mono />
          <Field label="Quoted freight" value={pkr(row.quotedFreight)} mono />
          <Field label="Actual freight" value={pkr(row.actualFreight)} mono />
          <Field label="Rate per weight" value={rate !== null ? `${rate.toFixed(2)} /kg` : undefined} mono />
          <Field label="Actual delivery date" value={dateShort(row.actualDeliveryDate)} mono />
          <Field label="Origin factory" value={row.originFactory} />
          <Field label="Destination" value={row.destination} span={2} />
        </FieldGrid>
      </Section>

      {/* 3 — shipping */}
      <Section id="s-shipping" title="Shipping" edit={<EditLink step="shipping" />}>
        {!isExport && (
          <p className="mb-3 text-xs italic text-muted">Shipping details usually apply to export orders.</p>
        )}
        <div className="mb-4 overflow-auto rounded-lg border border-line">
          <table className="w-full text-sm">
            <thead className="bg-canvas-alt text-xs text-muted">
              <tr>
                <th className="px-3 py-2 text-left">Container type</th>
                <th className="px-3 py-2 text-left">Container no.</th>
              </tr>
            </thead>
            <tbody>
              {row.containers.length === 0 && (
                <tr><td colSpan={2} className="px-3 py-4 text-center text-muted">No containers added yet</td></tr>
              )}
              {row.containers.map((c, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="px-3 py-2">{c.containerType || '—'}</td>
                  <td className="px-3 py-2 tabular-nums text-muted">{c.containerNo || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <FieldGrid>
          <Field label="POL" value={row.pol} />
          <Field label="POD" value={row.pod} />
          <Field label="Shipping line" value={row.shippingLine} />
          <Field label="Clearing agent" value={row.clearingAgent} />
          <Field label="Booking no." value={row.bookingNo} mono />
          <Field label="Port in date" value={dateShort(row.portInDate)} mono />
          <Field label="ETD / sailing date" value={dateShort(row.etdSailingDate)} mono />
          <Field label="CRO arrival date" value={dateShort(row.croArrivalDate)} mono />
          <Field label="Actual arrival date" value={dateShort(row.actualArrivalDate)} mono />
          <Field label="Arrival delay" value={daysFmt(arrivalDelay)} mono />
        </FieldGrid>
      </Section>

      {/* 4 — expenditures */}
      <Section id="s-expenditures" title="Expenditures" edit={<EditLink step="expenditures" />}>
        <div className="overflow-auto rounded-lg border border-line">
          <table className="w-full text-sm">
            <tbody>
              {costs.map((c) => {
                const v = Number((row as unknown as Record<string, number>)[c.name]) || 0
                return (
                  <tr key={c.name} className="border-t border-line first:border-t-0">
                    <td className="px-3 py-2 text-muted">{c.label}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{pkr(v)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-line font-semibold">
                <td className="px-3 py-2">Total expenditure</td>
                <td className="px-3 py-2 text-right tabular-nums">{pkr(costTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-2 text-xs italic text-muted">
          {isExport ? 'Export orders track the full cost set.' : 'Local orders only track packing and transportation charges.'}
        </p>
      </Section>

      {/* 5 — status */}
      <Section id="s-status" title="Status" edit={<EditLink step="status" />}>
        <FieldGrid>
          <Field label="Current status" value={<StatusBadge label={row.status} />} />
        </FieldGrid>
        {row.remarks && (
          <div className="mt-3 rounded-lg border border-line bg-canvas-alt px-3 py-2.5 text-[13px] leading-relaxed text-ink/80">
            {row.remarks}
          </div>
        )}
      </Section>
    </div>
  )
}

/* ---------- small local building blocks, matching ImportsStatusDetail's ---------- */

function KeyFigure({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className={`bg-surface px-3.5 py-2.5 ${warn ? 'bg-[var(--color-watch-bg)]' : ''}`}>
      <div className={`text-[10px] font-semibold uppercase tracking-wide ${warn ? 'text-[var(--color-watch)]' : 'text-muted'}`}>{label}</div>
      <div className="mt-0.5 truncate text-[15px] font-semibold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 truncate text-[10.5px] text-muted">{sub}</div>}
    </div>
  )
}

function Section({
  id, title, children, edit,
}: { id: string; title: string; children: React.ReactNode; edit?: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 rounded-xl border border-line bg-surface">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</h2>
        {edit}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-5 gap-y-3 lg:grid-cols-4">{children}</div>
}

function Field({
  label, value, span, mono,
}: { label: string; value?: React.ReactNode; span?: 2; mono?: boolean }) {
  return (
    <div className={span === 2 ? 'col-span-2' : undefined}>
      <div className="text-[10.5px] uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-0.5 text-[13.5px] ${mono ? 'tabular-nums' : ''}`}>
        {value === undefined || value === null || value === '' ? <span className="italic text-muted">—</span> : value}
      </div>
    </div>
  )
}
