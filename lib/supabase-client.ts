// Client-side Supabase access for the workspace_state snapshot.
// Uses the anon / publishable key directly from the browser, matching the
// plain-fetch REST style of supabase-server.ts. No heavy dependencies.
//
// Config resolution: values saved in the Settings panel (localStorage) take
// priority, then NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY from
// the environment, then none.

import type { MarketingWorkspaceData } from "@/lib/social-calendar-data";

export const WORKSPACE_STATE_TABLE = "workspace_state";
export const WORKSPACE_STATE_ROW_ID = "ucc-default";

const CONFIG_STORAGE_KEY = "ucc-os-supabase-config";

export type SupabaseConfig = {
  url: string;
  anonKey: string;
};

export type SupabaseConfigSource = "panel" | "env" | "none";

export type ResolvedSupabaseConfig = {
  config: SupabaseConfig | null;
  source: SupabaseConfigSource;
};

export type WorkspaceStateRow = {
  data: MarketingWorkspaceData;
  updatedAt: string | null;
};

function normaliseUrl(url: string) {
  return url.trim().replace(/\/+$/, "");
}

function readEnvConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && anonKey) {
    return { url: normaliseUrl(url), anonKey: anonKey.trim() };
  }

  return null;
}

function readPanelConfig(): SupabaseConfig | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<SupabaseConfig>;

    if (parsed.url && parsed.anonKey) {
      return { url: normaliseUrl(parsed.url), anonKey: parsed.anonKey.trim() };
    }

    return null;
  } catch {
    return null;
  }
}

export function resolveSupabaseConfig(): ResolvedSupabaseConfig {
  const panel = readPanelConfig();

  if (panel) {
    return { config: panel, source: "panel" };
  }

  const env = readEnvConfig();

  if (env) {
    return { config: env, source: "env" };
  }

  return { config: null, source: "none" };
}

export function saveSupabaseConfig(config: SupabaseConfig) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    CONFIG_STORAGE_KEY,
    JSON.stringify({
      url: normaliseUrl(config.url),
      anonKey: config.anonKey.trim(),
    }),
  );
}

export function clearSupabaseConfig() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(CONFIG_STORAGE_KEY);
}

function restHeaders(anonKey: string) {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    "Content-Type": "application/json",
  };
}

async function describeError(response: Response) {
  let body = "";

  try {
    body = (await response.text()).trim();
  } catch {
    body = "";
  }

  return `${response.status} ${response.statusText}${body ? `: ${body}` : ""}`.trim();
}

export async function fetchWorkspaceState(
  config: SupabaseConfig,
): Promise<WorkspaceStateRow | null> {
  const endpoint = `${normaliseUrl(config.url)}/rest/v1/${WORKSPACE_STATE_TABLE}?id=eq.${WORKSPACE_STATE_ROW_ID}&select=data,updated_at`;
  const response = await fetch(endpoint, { headers: restHeaders(config.anonKey) });

  if (!response.ok) {
    throw new Error(await describeError(response));
  }

  const rows = (await response.json()) as Array<{
    data: MarketingWorkspaceData;
    updated_at: string | null;
  }>;
  const row = rows[0];

  if (!row || !row.data) {
    return null;
  }

  return { data: row.data, updatedAt: row.updated_at ?? null };
}

export async function upsertWorkspaceState(
  config: SupabaseConfig,
  data: MarketingWorkspaceData,
): Promise<void> {
  const endpoint = `${normaliseUrl(config.url)}/rest/v1/${WORKSPACE_STATE_TABLE}?on_conflict=id`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      ...restHeaders(config.anonKey),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      id: WORKSPACE_STATE_ROW_ID,
      data,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(await describeError(response));
  }
}

// Workspace snapshot history (Module E1). One row per saved version, newest
// first, pruned to the last 20. This uses its OWN table, separate from the
// single-row workspace_state table, because it holds many versions. Creating
// it never touches workspace_state, so live data is safe.

export const WORKSPACE_SNAPSHOTS_TABLE = "workspace_snapshots";
export const SNAPSHOT_KEEP_COUNT = 20;

// Recognises the "the workspace_snapshots table has not been created yet"
// case (a PostgREST 404 or a relation-not-found body) so the UI can tell the
// owner exactly what to do instead of showing a bare 404.
export class SnapshotTableMissingError extends Error {
  constructor(public readonly detail: string) {
    super(
      `The "${WORKSPACE_SNAPSHOTS_TABLE}" table does not exist in Supabase yet, so version history is off. ` +
        "Your main data in the workspace_state table is unaffected. To turn on version history, run the SQL in " +
        "supabase/migrations/20260704000000_workspace_snapshots.sql in the Supabase SQL editor. " +
        `(Supabase said: ${detail})`,
    );
    this.name = "SnapshotTableMissingError";
  }
}

export function isSnapshotTableMissing(error: unknown): boolean {
  return error instanceof SnapshotTableMissingError;
}

function looksLikeMissingTable(status: number, body: string): boolean {
  const haystack = body.toLowerCase();

  return (
    // PostgREST returns 404 with PGRST205 / "could not find the table" when a
    // table is absent from the schema cache, or 42P01 relation-not-found.
    (status === 404 &&
      (haystack.includes(WORKSPACE_SNAPSHOTS_TABLE) ||
        haystack.includes("could not find the table") ||
        haystack.includes("schema cache") ||
        haystack.includes("pgrst205"))) ||
    haystack.includes("42p01") ||
    (haystack.includes(WORKSPACE_SNAPSHOTS_TABLE) &&
      haystack.includes("does not exist"))
  );
}

// Turns a failed snapshot response into either the clear "table missing"
// error or the verbatim status and body, so nothing fails silently.
async function snapshotError(response: Response): Promise<Error> {
  let body = "";

  try {
    body = (await response.text()).trim();
  } catch {
    body = "";
  }

  if (looksLikeMissingTable(response.status, body)) {
    return new SnapshotTableMissingError(
      `${response.status} ${response.statusText}${body ? `: ${body}` : ""}`.trim(),
    );
  }

  return new Error(
    `${response.status} ${response.statusText}${body ? `: ${body}` : ""}`.trim(),
  );
}

export type WorkspaceSnapshotMeta = {
  id: string;
  createdAt: string;
};

export async function insertWorkspaceSnapshot(
  config: SupabaseConfig,
  data: MarketingWorkspaceData,
): Promise<void> {
  const endpoint = `${config.url.replace(/\/+$/, "")}/rest/v1/${WORKSPACE_SNAPSHOTS_TABLE}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { ...restHeaders(config.anonKey), Prefer: "return=minimal" },
    body: JSON.stringify({ workspace_id: WORKSPACE_STATE_ROW_ID, data }),
  });

  if (!response.ok) {
    throw await snapshotError(response);
  }
}

export async function listWorkspaceSnapshots(
  config: SupabaseConfig,
): Promise<WorkspaceSnapshotMeta[]> {
  const endpoint = `${config.url.replace(/\/+$/, "")}/rest/v1/${WORKSPACE_SNAPSHOTS_TABLE}?workspace_id=eq.${WORKSPACE_STATE_ROW_ID}&select=id,created_at&order=created_at.desc&limit=${SNAPSHOT_KEEP_COUNT}`;
  const response = await fetch(endpoint, { headers: restHeaders(config.anonKey) });

  if (!response.ok) {
    throw await snapshotError(response);
  }

  const rows = (await response.json()) as Array<{ id: string; created_at: string }>;
  return rows.map((row) => ({ id: row.id, createdAt: row.created_at }));
}

export async function fetchWorkspaceSnapshot(
  config: SupabaseConfig,
  id: string,
): Promise<MarketingWorkspaceData | null> {
  const endpoint = `${config.url.replace(/\/+$/, "")}/rest/v1/${WORKSPACE_SNAPSHOTS_TABLE}?id=eq.${encodeURIComponent(id)}&select=data`;
  const response = await fetch(endpoint, { headers: restHeaders(config.anonKey) });

  if (!response.ok) {
    throw await snapshotError(response);
  }

  const rows = (await response.json()) as Array<{ data: MarketingWorkspaceData }>;
  return rows[0]?.data ?? null;
}

export async function pruneWorkspaceSnapshots(config: SupabaseConfig): Promise<void> {
  const listEndpoint = `${config.url.replace(/\/+$/, "")}/rest/v1/${WORKSPACE_SNAPSHOTS_TABLE}?workspace_id=eq.${WORKSPACE_STATE_ROW_ID}&select=id&order=created_at.desc&offset=${SNAPSHOT_KEEP_COUNT}&limit=100`;
  const response = await fetch(listEndpoint, { headers: restHeaders(config.anonKey) });

  if (!response.ok) {
    throw await snapshotError(response);
  }

  const rows = (await response.json()) as Array<{ id: string }>;

  if (rows.length === 0) {
    return;
  }

  const ids = rows.map((row) => `"${row.id}"`).join(",");
  const deleteEndpoint = `${config.url.replace(/\/+$/, "")}/rest/v1/${WORKSPACE_SNAPSHOTS_TABLE}?id=in.(${ids})`;
  const deleteResponse = await fetch(deleteEndpoint, {
    method: "DELETE",
    headers: restHeaders(config.anonKey),
  });

  if (!deleteResponse.ok) {
    throw new Error(await describeError(deleteResponse));
  }
}

// Supabase Storage for the Asset Library (Module B2). Uses a public bucket
// named "assets" that the owner creates once in the Supabase dashboard.

export const ASSET_BUCKET = "assets";

function sanitizeStorageName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120) || "file";
}

export async function uploadAssetFile(
  config: SupabaseConfig,
  file: File,
): Promise<{ publicUrl: string; storagePath: string }> {
  const storagePath = `${Date.now()}-${sanitizeStorageName(file.name)}`;
  const endpoint = `${config.url.replace(/\/+$/, "")}/storage/v1/object/${ASSET_BUCKET}/${storagePath}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "false",
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error(await describeError(response));
  }

  return {
    publicUrl: `${config.url.replace(/\/+$/, "")}/storage/v1/object/public/${ASSET_BUCKET}/${storagePath}`,
    storagePath,
  };
}

export async function deleteAssetFile(
  config: SupabaseConfig,
  storagePath: string,
): Promise<void> {
  const endpoint = `${config.url.replace(/\/+$/, "")}/storage/v1/object/${ASSET_BUCKET}/${storagePath}`;
  const response = await fetch(endpoint, {
    method: "DELETE",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(await describeError(response));
  }
}

export async function testWorkspaceConnection(
  config: SupabaseConfig,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const endpoint = `${normaliseUrl(config.url)}/rest/v1/${WORKSPACE_STATE_TABLE}?select=id&limit=1`;
    const response = await fetch(endpoint, { headers: restHeaders(config.anonKey) });

    if (!response.ok) {
      return { ok: false, error: await describeError(response) };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
