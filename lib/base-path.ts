// Support serving the app under a URL sub-path (for example
// https://apps.unitedceres.edu.sg/social_media_os) behind a reverse proxy
// that keeps the path prefix. Next.js `basePath` prefixes pages and the
// framework's own asset requests automatically, but hand-written client
// fetch("/api/...") calls are NOT rewritten, so they must be wrapped with
// apiUrl() to pick up the same prefix. When NEXT_PUBLIC_BASE_PATH is unset
// (local dev, root deployments) this is a no-op.

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function apiUrl(path: string): string {
  return `${BASE_PATH}${path}`;
}
