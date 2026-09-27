export const MAX_SIDE = 2000

/** Target size that keeps the aspect ratio and caps the longest side. */
export function targetSize(width: number, height: number, max = MAX_SIDE) {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}
