import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
