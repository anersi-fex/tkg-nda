/**
 * A PNG data URL the browser made, checked before it is stored or drawn: the data URL prefix, a
 * size cap, the PNG signature, and the declared width and height from the IHDR chunk (a hostile
 * file can be small on disk and declare a huge picture). Pure, browser-safe.
 */
export const PNG_PREFIX = "data:image/png;base64,";
export const PNG_MAX_CHARS = 400_000;
const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export type PngInfo = { width: number; height: number; bytes: number };

/** Width, height and byte size of a valid PNG data URL, or null when it is not one. */
export function pngInfo(value: unknown): PngInfo | null {
  if (typeof value !== "string" || !value.startsWith(PNG_PREFIX) || value.length > PNG_MAX_CHARS || value.length < PNG_PREFIX.length + 100) return null;
  const b64 = value.slice(PNG_PREFIX.length);
  if (!/^[A-Za-z0-9+/]+=*$/.test(b64)) return null;
  let head: Uint8Array;
  try {
    head = Uint8Array.from(atob(b64.slice(0, 48)), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
  if (head.length < 33 || !SIGNATURE.every((b, i) => head[i] === b)) return null;
  // Bytes 12..15 must be "IHDR"; width and height follow as big-endian 32-bit integers.
  if (head[12] !== 0x49 || head[13] !== 0x48 || head[14] !== 0x44 || head[15] !== 0x52) return null;
  const width = ((head[16] << 24) | (head[17] << 16) | (head[18] << 8) | head[19]) >>> 0;
  const height = ((head[20] << 24) | (head[21] << 16) | (head[22] << 8) | head[23]) >>> 0;
  if (width === 0 || height === 0) return null;
  const bytes = Math.floor((b64.length * 3) / 4) - (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0);
  return { width, height, bytes };
}

/** The pad draws 600x200 at 2x or 3x and 240x160; anything far beyond that is refused. */
export const MAX_SIGNATURE = { width: 2400, height: 1000 };
export const MAX_INITIALS = { width: 1200, height: 800 };

export function pngFits(info: PngInfo | null, max: { width: number; height: number }): info is PngInfo {
  return !!info && info.width <= max.width && info.height <= max.height && info.width * info.height <= 2_500_000;
}
