// NCS codes in the advisor's replies, shown as colour swatches.
//
// NCS is defined by how colours look, not by numbers a screen can show, so
// any conversion is an approximation. This is the widely used approximation
// from w3color.js. Swatches are always labelled as approximate.

export interface Rgb { r: number; g: number; b: number }

const KOD = /\b(?:NCS\s+)?S\s?(\d{2})(\d{2})-(N|[YRGB](?:\d{2}[YRGB])?)(?![\w-])/g

/** NCS codes in a text, normalised to "S 1515-Y20R", first occurrence only. */
export function findNcs(text: string): string[] {
  const out: string[] = []
  for (const m of text.matchAll(KOD)) {
    const kod = `S ${m[1]}${m[2]}-${m[3]}`
    if (!out.includes(kod) && ncsToRgb(kod)) out.push(kod)
  }
  return out
}

/** Approximate screen colour for an NCS code, or null if it is not valid. */
export function ncsToRgb(kod: string): Rgb | null {
  const m = kod.trim().toUpperCase().match(/^S\s?(\d{2})(\d{2})-(N|([YRGB])(?:(\d{2})([YRGB]))?)$/)
  if (!m) return null
  const black = Number(m[1])
  const chroma = Number(m[2])
  if (black + chroma > 100) return null
  if (m[3] === 'N') {
    const grey = clamp(Math.trunc((1 - black / 100) * 255))
    return { r: grey, g: grey, b: grey }
  }
  const bc = m[4]
  const percent = m[5] ? Number(m[5]) : 0
  const next = m[6]
  const order = 'YRBG'
  if (next && order[(order.indexOf(bc) + 1) % 4] !== next) return null

  const black1 = 1.05 * black - 5.25
  let red1 = 0, green1 = 0, blue1 = 0, f: number

  if (bc === 'Y' && percent <= 60) red1 = 1
  else if ((bc === 'Y' && percent > 60) || (bc === 'R' && percent <= 80)) {
    f = bc === 'Y' ? percent - 60 : percent + 40
    red1 = (Math.sqrt(14884 - f * f) - 22) / 100
  } else if ((bc === 'R' && percent > 80) || bc === 'B') red1 = 0
  else if (bc === 'G') {
    f = percent - 170
    red1 = (Math.sqrt(33800 - f * f) - 70) / 100
  }

  if (bc === 'Y' && percent <= 80) blue1 = 0
  else if ((bc === 'Y' && percent > 80) || (bc === 'R' && percent <= 60)) {
    f = bc === 'Y' ? percent - 80 + 20.5 : percent + 20 + 20.5
    blue1 = (104 - Math.sqrt(11236 - f * f)) / 100
  } else if ((bc === 'R' && percent > 60) || (bc === 'B' && percent <= 80)) {
    f = bc === 'R' ? percent - 60 - 60 : percent + 40 - 60
    blue1 = (Math.sqrt(10000 - f * f) - 10) / 100
  } else if ((bc === 'B' && percent > 80) || (bc === 'G' && percent <= 40)) {
    f = bc === 'B' ? percent - 80 - 131 : percent + 20 - 131
    blue1 = (122 - Math.sqrt(19881 - f * f)) / 100
  } else if (bc === 'G' && percent > 40) blue1 = 0

  if (bc === 'Y') green1 = (85 - (17 / 20) * percent) / 100
  else if (bc === 'R' && percent <= 60) green1 = 0
  else if (bc === 'R' && percent > 60) {
    f = percent - 60 + 35
    green1 = (67.5 - Math.sqrt(5776 - f * f)) / 100
  } else if (bc === 'B' && percent <= 60) {
    f = percent - 68.5
    green1 = (6.5 + Math.sqrt(7044.5 - f * f)) / 100
  } else if ((bc === 'B' && percent > 60) || (bc === 'G' && percent <= 60)) green1 = 0.9
  else if (bc === 'G' && percent > 60) green1 = (90 - (percent - 60) / 8) / 100

  const mid = (red1 + green1 + blue1) / 3
  const r2 = (mid - red1) * (100 - chroma) / 100 + red1
  const g2 = (mid - green1) * (100 - chroma) / 100 + green1
  const b2 = (mid - blue1) * (100 - chroma) / 100 + blue1
  let max: number
  if (r2 > g2 && r2 > b2) max = r2
  else if (g2 > r2 && g2 > b2) max = g2
  else if (b2 > r2 && b2 > g2) max = b2
  else max = (r2 + g2 + b2) / 3
  const k = (1 / max) * (100 - black1) / 100 * 255
  return { r: clamp(Math.trunc(r2 * k)), g: clamp(Math.trunc(g2 * k)), b: clamp(Math.trunc(b2 * k)) }
}

export function hex({ r, g, b }: Rgb): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()
}

function clamp(v: number): number {
  return Math.max(0, Math.min(255, v))
}
