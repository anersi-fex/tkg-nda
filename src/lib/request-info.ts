/**
 * What the server knows about the device behind a request: the address it came from, the
 * browser, and Vercel's approximate location for that address. Pure parsing (browser-safe types;
 * the headers come from next/headers or a NextRequest). Nothing here is trusted from the body.
 */
export type Geo = { city?: string; region?: string; country?: string; latitude?: string; longitude?: string; timezone?: string };

export type RequestInfo = { ip: string; userAgent: string; geo: Geo };

type HeaderSource = { get(name: string): string | null };

function clean(value: string | null, max: number): string {
  if (!value) return "";
  let s = value;
  try {
    s = decodeURIComponent(value);
  } catch {
    /* keep as sent */
  }
  return s.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
}

/** An IPv4 or IPv6 address, else "". Rejects anything that is not address-shaped. */
export function cleanIp(value: string | null | undefined): string {
  const s = (value ?? "").trim();
  if (!s || s.length > 64) return "";
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(s)) return s;
  if (/^[0-9a-f:.]{2,45}$/i.test(s) && s.includes(":")) return s.toLowerCase();
  return "";
}

/**
 * The client's address. On Vercel x-real-ip and x-forwarded-for (first entry) are set by the
 * platform and cannot be spoofed by the browser; other hosts set x-forwarded-for the same way.
 */
export function clientIp(h: HeaderSource): string {
  const real = cleanIp(h.get("x-real-ip"));
  if (real) return real;
  const fwd = h.get("x-forwarded-for");
  if (fwd) {
    const first = cleanIp(fwd.split(",")[0]);
    if (first) return first;
  }
  return "";
}

export function requestInfo(h: HeaderSource): RequestInfo {
  const geo: Geo = {};
  const city = clean(h.get("x-vercel-ip-city"), 80);
  const region = clean(h.get("x-vercel-ip-country-region"), 40);
  const country = clean(h.get("x-vercel-ip-country"), 8);
  const latitude = clean(h.get("x-vercel-ip-latitude"), 24);
  const longitude = clean(h.get("x-vercel-ip-longitude"), 24);
  const timezone = clean(h.get("x-vercel-ip-timezone"), 60);
  if (city) geo.city = city;
  if (region) geo.region = region;
  if (country) geo.country = country;
  if (latitude && /^-?\d+(\.\d+)?$/.test(latitude)) geo.latitude = latitude;
  if (longitude && /^-?\d+(\.\d+)?$/.test(longitude)) geo.longitude = longitude;
  if (timezone) geo.timezone = timezone;
  return { ip: clientIp(h), userAgent: clean(h.get("user-agent"), 400), geo };
}

/** "Troy, MI, US" from the parts Vercel gave, else "". */
export function geoLabel(geo: Geo | null | undefined): string {
  if (!geo) return "";
  return [geo.city, geo.region, geo.country].filter(Boolean).join(", ");
}

/** "iPhone, Safari" / "Windows, Chrome" / "Mac, Firefox" from a user agent string; "" when unknown. */
export function deviceLabel(ua: string | null | undefined): string {
  if (!ua) return "";
  const device = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua) || (/Macintosh/.test(ua) && /Mobile/.test(ua))
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Windows/.test(ua)
          ? "Windows"
          : /Macintosh|Mac OS/.test(ua)
            ? "Mac"
            : /CrOS/.test(ua)
              ? "Chromebook"
              : /Linux/.test(ua)
                ? "Linux"
                : "";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /SamsungBrowser/.test(ua)
        ? "Samsung Internet"
        : /CriOS/.test(ua)
          ? "Chrome"
          : /FxiOS/.test(ua)
            ? "Firefox"
            : /Chrome\//.test(ua) && !/Chromium/.test(ua)
              ? "Chrome"
              : /Firefox\//.test(ua)
                ? "Firefox"
                : /Safari\//.test(ua) && /Version\//.test(ua)
                  ? "Safari"
                  : "";
  return [device, browser].filter(Boolean).join(", ");
}
