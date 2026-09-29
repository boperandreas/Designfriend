// Pixel work for idea sketches. The image model redraws the whole photo, so
// after generation we put the original pixels back everywhere outside the
// areas that were allowed to change (AGENTS.md rule 7). Pure functions on
// typed arrays, so they can be tested without a browser.

/** 255 where a mask image marks the area (bright and opaque), else 0. */
export function maskFromRGBA(rgba: Uint8ClampedArray, into?: Uint8Array): Uint8Array {
  const n = rgba.length / 4
  const out = into ?? new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    const j = i * 4
    if (rgba[j + 3] > 127 && rgba[j] + rgba[j + 1] + rgba[j + 2] > 381) out[i] = 255
  }
  return out
}

/** Share of pixels set in a mask. */
export function coverage(mask: Uint8Array): number {
  let n = 0
  for (let i = 0; i < mask.length; i++) if (mask[i]) n++
  return mask.length ? n / mask.length : 0
}

/**
 * Grow a binary mask by r pixels in every direction (square neighbourhood).
 * Two linear passes per axis using the distance to the nearest set pixel.
 */
export function dilate(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  if (r <= 0) return mask.slice()
  const tmp = new Uint8Array(mask.length)
  const out = new Uint8Array(mask.length)
  const pass = (src: Uint8Array, dst: Uint8Array, len: number, count: number, idx: (line: number, k: number) => number) => {
    const dist = new Int32Array(len)
    for (let line = 0; line < count; line++) {
      let d = 1 << 30
      for (let k = 0; k < len; k++) {
        d = src[idx(line, k)] ? 0 : d + 1
        dist[k] = d
      }
      d = 1 << 30
      for (let k = len - 1; k >= 0; k--) {
        d = src[idx(line, k)] ? 0 : d + 1
        if (Math.min(d, dist[k]) <= r) dst[idx(line, k)] = 255
      }
    }
  }
  pass(mask, tmp, w, h, (y, x) => y * w + x)
  pass(tmp, out, h, w, (x, y) => y * w + x)
  return out
}

/** Soften a mask with a separable box blur of radius r (values 0..255). */
export function feather(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  if (r <= 0) return mask.slice()
  const blur1d = (src: Uint8Array, dst: Uint8Array, len: number, count: number, idx: (line: number, k: number) => number) => {
    const size = 2 * r + 1
    for (let line = 0; line < count; line++) {
      let sum = 0
      for (let k = -r; k <= r; k++) sum += src[idx(line, Math.min(len - 1, Math.max(0, k)))]
      for (let k = 0; k < len; k++) {
        dst[idx(line, k)] = Math.round(sum / size)
        const add = Math.min(len - 1, k + r + 1)
        const sub = Math.max(0, k - r)
        sum += src[idx(line, add)] - src[idx(line, sub)]
      }
    }
  }
  const tmp = new Uint8Array(mask.length)
  const out = new Uint8Array(mask.length)
  blur1d(mask, tmp, w, h, (y, x) => y * w + x)
  blur1d(tmp, out, h, w, (x, y) => y * w + x)
  return out
}

/** out = original where alpha is 0, generated where alpha is 255, blended between. */
export function blend(original: Uint8ClampedArray, generated: Uint8ClampedArray, alpha: Uint8Array): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(original.length)
  for (let i = 0; i < alpha.length; i++) {
    const a = alpha[i]
    const j = i * 4
    if (a === 0) {
      out[j] = original[j]; out[j + 1] = original[j + 1]; out[j + 2] = original[j + 2]
    } else if (a === 255) {
      out[j] = generated[j]; out[j + 1] = generated[j + 1]; out[j + 2] = generated[j + 2]
    } else {
      out[j] = original[j] + ((generated[j] - original[j]) * a) / 255
      out[j + 1] = original[j + 1] + ((generated[j + 1] - original[j + 1]) * a) / 255
      out[j + 2] = original[j + 2] + ((generated[j + 2] - original[j + 2]) * a) / 255
    }
    out[j + 3] = 255
  }
  return out
}

/** How far to grow and soften the mask for a photo of this size. */
export function margins(w: number, h: number): { grow: number; soft: number } {
  const grow = Math.max(4, Math.round(Math.max(w, h) * 0.015))
  return { grow, soft: Math.max(2, Math.round(grow / 2)) }
}

/**
 * Where two small, equally sized images clearly differ: 255 where the summed
 * RGB difference exceeds the threshold. Used when SAM finds no mask, so the
 * original can still be restored wherever the model did not really change
 * anything. Mild colour shifts across the whole image stay below the threshold.
 */
export function diffMask(a: Uint8ClampedArray, b: Uint8ClampedArray, threshold = 90): Uint8Array {
  const n = a.length / 4
  const out = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    const j = i * 4
    const d = Math.abs(a[j] - b[j]) + Math.abs(a[j + 1] - b[j + 1]) + Math.abs(a[j + 2] - b[j + 2])
    if (d > threshold) out[i] = 255
  }
  return out
}

/** Shrink a binary mask by r pixels; removes specks smaller than the radius. */
export function erode(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  const inv = mask.map((v) => (v ? 0 : 255))
  return dilate(inv, w, h, r).map((v) => (v ? 0 : 255))
}

/** Nearest-neighbour upscale of a small mask to full size. */
export function upscale(mask: Uint8Array, sw: number, sh: number, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    const sy = Math.min(sh - 1, Math.floor((y * sh) / h))
    for (let x = 0; x < w; x++) out[y * w + x] = mask[sy * sw + Math.min(sw - 1, Math.floor((x * sw) / w))]
  }
  return out
}

export interface Plats { x: number; y: number; bredd: number; hojd: number }

/** Mark boxes given in percent of the image as part of the mask. */
export function fillBoxes(mask: Uint8Array, w: number, h: number, platser: Plats[]): void {
  for (const p of platser) {
    const x0 = Math.max(0, Math.floor((p.x / 100) * w))
    const y0 = Math.max(0, Math.floor((p.y / 100) * h))
    const x1 = Math.min(w, Math.ceil(((p.x + p.bredd) / 100) * w))
    const y1 = Math.min(h, Math.ceil(((p.y + p.hojd) / 100) * h))
    for (let y = y0; y < y1; y++) mask.fill(255, y * w + x0, y * w + x1)
  }
}
