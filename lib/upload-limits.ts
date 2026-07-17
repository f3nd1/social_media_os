// Single source of truth for the document upload size limit, shared by the
// server extract routes and the client-side pre-upload checks so the number
// never drifts between layers.
//
// Note on the real ceiling: in production the app runs behind an nginx reverse
// proxy on the droplet. nginx enforces its own `client_max_body_size` (default
// 1 MB) BEFORE the request reaches Next, and returns its own 413 HTML page. For
// uploads up to this limit to work in production, nginx must be raised to match
// (see docs/nginx-upload-size.md). This constant only governs the app layer.

export const MAX_UPLOAD_MB = 25;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

// Human-readable file size for UI messages ("8.3 MB", "412 KB").
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;

  if (kb < 1024) {
    return `${Math.round(kb)} KB`;
  }

  return `${(kb / 1024).toFixed(1)} MB`;
}

// Shared wording for a file that exceeds MAX_UPLOAD_MB, used by both the
// client-side pre-upload checks and the server routes' 413 responses, so the
// message always states the real limit and the file's actual size and never
// drifts between call sites.
export function oversizedFileMessage(bytes: number, noun: string = "file"): string {
  return `This file is ${formatFileSize(bytes)}. The maximum allowed size is ${MAX_UPLOAD_MB} MB. Please compress the ${noun} or upload a smaller one.`;
}
