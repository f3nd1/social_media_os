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
