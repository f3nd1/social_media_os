import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// "17 Feb 2026" style for dates the user reads on screen. Never use this for
// dates sent to an API or bound to a date input; those keep their native
// YYYY-MM-DD form. Falls back to the raw value rather than crashing or
// silently dropping data if it cannot be parsed.
export function formatDisplayDate(value: string): string {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

// Title-cases a lowercase role string ("marketing manager" -> "Marketing Manager").
export function roleLabel(role: string): string {
  return role
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// Strips an uploaded file name down to characters safe for a temp file path.
export function sanitizeFileName(fileName: string, fallback: string): string {
  const safeName = fileName.replace(/[^a-z0-9._-]/gi, "-").slice(0, 100);
  return safeName || fallback;
}

// A genuine profile link is distinct per platform. When the same url is given to
// two or more platforms (typically the org homepage, not a real per-platform
// profile), it is not a real profile link, so drop the url from every platform
// that shares it, keeping the name with no link rather than fabricating
// distinctness. Comparison ignores case and a trailing slash.
export function dropSharedProfileUrls<T extends { url: string }>(list: T[]): T[] {
  const key = (url: string) => url.trim().toLowerCase().replace(/\/+$/, "");
  const counts = new Map<string, number>();
  for (const item of list) {
    if (item.url) {
      counts.set(key(item.url), (counts.get(key(item.url)) ?? 0) + 1);
    }
  }
  return list.map((item) =>
    item.url && (counts.get(key(item.url)) ?? 0) > 1 ? { ...item, url: "" } : item,
  );
}

// Reads a fetch Response as JSON, but fails with a plain readable message when
// the server returns a non-JSON body (an HTML error page from a reverse proxy
// or a crashed route). This replaces the cryptic "Unexpected token '<'" crash
// that response.json() throws when it is handed an HTML page. Structured JSON
// error bodies (for example { ok: false, error }) still parse and pass through.
export async function readJsonResponse<T>(response: Response): Promise<T> {
  const body = await response.text();

  try {
    return JSON.parse(body) as T;
  } catch {
    const status = response.status ? ` (HTTP ${response.status})` : "";
    throw new Error(
      `The server could not process the upload${status}. Please try again, or use a smaller text-based PDF.`,
    );
  }
}
