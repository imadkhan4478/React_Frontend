import { useTheme } from '@/theme/ThemeContext'
import { cn } from '@/lib/utils'

/**
 * Static isometric supply-chain scene — warehouse, stacked containers, a
 * truck on a route, floating package cubes and a flight arc, drawn as clean
 * vector. Fills its (positioned) container and anchors bottom-right, so it's
 * meant to sit inside the Dashboard hero band with the heading text on the
 * left. Deliberately dependency-free of filters/animation: it paints once
 * and costs nothing after — no backdrop-blur, no animated blobs (those were
 * the source of the earlier lag). Theme-aware (lighter tint on dark).
 */

const SCALE = 30
const IX = Math.cos(Math.PI / 6)
const IY = Math.sin(Math.PI / 6)

function iso(x: number, y: number, z = 0): [number, number] {
  return [(x - y) * IX * SCALE, ((x + y) * IY - z) * SCALE]
}
function poly(points: [number, number, number][]): string {
  return points.map(([x, y, z]) => { const [sx, sy] = iso(x, y, z); return `${sx.toFixed(1)},${sy.toFixed(1)}` }).join(' ')
}

interface Faces { top: string; left: string; right: string }
function box(x: number, y: number, z0: number, w: number, d: number, h: number): Faces {
  const z1 = z0 + h
  return {
    top: poly([[x, y, z1], [x + w, y, z1], [x + w, y + d, z1], [x, y + d, z1]]),
    left: poly([[x, y + d, z0], [x + w, y + d, z0], [x + w, y + d, z1], [x, y + d, z1]]),
    right: poly([[x + w, y, z0], [x + w, y + d, z0], [x + w, y + d, z1], [x + w, y, z1]]),
  }
}

const WAREHOUSE = box(-3, -2.5, 0, 6.5, 5, 3)
const WAREHOUSE_ROOF = box(-3, -2.5, 3, 6.5, 5, 0.35)
const CONTAINERS: { f: Faces; tone: 'accent' | 'violet' | 'gold' }[] = [
  { f: box(-10.6, -1, 0, 3.4, 1.7, 1.5), tone: 'accent' },
  { f: box(-10.6, -1, 1.5, 3.4, 1.7, 1.5), tone: 'violet' },
  { f: box(-10.6, 1.1, 0, 3.4, 1.7, 1.5), tone: 'gold' },
  { f: box(-6.7, 1.5, 0, 3.4, 1.7, 1.5), tone: 'accent' },
]
const TRUCK_TRAILER = box(1.6, 4.7, 0, 4, 1.7, 1.9)
const TRUCK_CAB = box(5.7, 4.7, 0, 1.5, 1.7, 1.35)
const CUBES = [box(-1, -9, 5.4, 1.3, 1.3, 1.3), box(4.6, -7, 6.4, 1.1, 1.1, 1.1), box(-7.2, -7.6, 4.7, 1.2, 1.2, 1.2)]

const GRID: string[] = []
for (let gx = -13; gx <= 9; gx += 2) {
  const [x1, y1] = iso(gx, -8, 0); const [x2, y2] = iso(gx, 7, 0)
  GRID.push(`M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`)
}
for (let gy = -8; gy <= 7; gy += 2) {
  const [x1, y1] = iso(-13, gy, 0); const [x2, y2] = iso(9, gy, 0)
  GRID.push(`M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`)
}

const [rsx, rsy] = iso(-13, 6.3, 0)
const [rex, rey] = iso(9, 6.3, 0)

const TONES = { accent: '#6366F1', violet: '#8B5CF6', gold: '#C08A2E' }

export function SupplyChainScene({ className }: { className?: string }) {
  const { dark } = useTheme()
  const faceOp = dark ? { top: 0.24, left: 0.15, right: 0.09 } : { top: 0.17, left: 0.11, right: 0.07 }
  const stroke = dark ? '#A5B4FC' : '#4F46E5'
  const strokeOp = dark ? 0.36 : 0.26
  const gridOp = dark ? 0.14 : 0.1

  const IsoBox = ({ f, tone }: { f: Faces; tone: string }) => (
    <g stroke={stroke} strokeOpacity={strokeOp} strokeWidth={1} strokeLinejoin="round">
      <polygon points={f.right} fill={tone} fillOpacity={faceOp.right} />
      <polygon points={f.left} fill={tone} fillOpacity={faceOp.left} />
      <polygon points={f.top} fill={tone} fillOpacity={faceOp.top} />
    </g>
  )

  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      {/* Static soft glow — a plain CSS gradient (no blur filter) so it's
          free to paint. */}
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(115% 130% at 82% 115%, ${TONES.accent}${dark ? '2e' : '1f'}, transparent 60%)` }}
      />
      <svg
        className="absolute bottom-0 right-0"
        style={{ width: 'min(920px, 78%)' }}
        viewBox="0 0 1440 760"
        preserveAspectRatio="xMaxYMax meet"
        fill="none"
      >
        <g transform="translate(770, 430)">
          <g stroke={stroke} strokeOpacity={gridOp} strokeWidth={1}>
            {GRID.map((d, i) => <path key={i} d={d} />)}
          </g>
          <line
            x1={rsx} y1={rsy} x2={rex} y2={rey}
            stroke={stroke} strokeOpacity={dark ? 0.5 : 0.34} strokeWidth={2.5}
            strokeLinecap="round" strokeDasharray="2 12"
          />
          {CONTAINERS.map((c, i) => <IsoBox key={i} f={c.f} tone={TONES[c.tone]} />)}
          <IsoBox f={WAREHOUSE} tone={TONES.accent} />
          <IsoBox f={WAREHOUSE_ROOF} tone={stroke} />
          <IsoBox f={TRUCK_TRAILER} tone={TONES.violet} />
          <IsoBox f={TRUCK_CAB} tone={TONES.accent} />
          {CUBES.map((f, i) => <IsoBox key={i} f={f} tone={TONES.gold} />)}
          <path
            d="M -560 -250 Q 40 -370 600 -210"
            stroke={stroke} strokeOpacity={dark ? 0.34 : 0.22} strokeWidth={1.5}
            strokeLinecap="round" strokeDasharray="1 10"
          />
        </g>
      </svg>
    </div>
  )
}
