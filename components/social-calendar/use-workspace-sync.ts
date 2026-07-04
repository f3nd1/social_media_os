"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { MarketingWorkspaceData } from "@/lib/social-calendar-data";
import { normalizeWorkspaceData } from "@/lib/social-calendar-storage";
import {
  clearSupabaseConfig,
  fetchWorkspaceSnapshot,
  fetchWorkspaceState,
  insertWorkspaceSnapshot,
  listWorkspaceSnapshots,
  pruneWorkspaceSnapshots,
  resolveSupabaseConfig,
  saveSupabaseConfig,
  testWorkspaceConnection,
  upsertWorkspaceState,
  type SupabaseConfig,
  type SupabaseConfigSource,
  type WorkspaceSnapshotMeta,
} from "@/lib/supabase-client";

export type SyncStatus =
  | "local-only"
  | "connecting"
  | "synced"
  | "saving"
  | "offline"
  | "error";

export type WorkspaceSync = {
  status: SyncStatus;
  source: SupabaseConfigSource;
  isConfigured: boolean;
  lastError: string;
  needsMigration: boolean;
  copyLocalToCloud: () => Promise<void>;
  reloadFromCloud: () => Promise<void>;
  testConnection: (
    config: SupabaseConfig,
  ) => Promise<{ ok: boolean; error?: string }>;
  saveConfigAndReload: (config: SupabaseConfig) => void;
  clearConfigAndReload: () => void;
  // Snapshot history (Module E1). All report honest errors, never fake success.
  saveSnapshotNow: () => Promise<{ ok: boolean; error?: string }>;
  listSnapshots: () => Promise<
    { ok: true; snapshots: WorkspaceSnapshotMeta[] } | { ok: false; error: string }
  >;
  restoreSnapshot: (id: string) => Promise<{ ok: boolean; error?: string }>;
};

const PUSH_DEBOUNCE_MS = 1200;

export function useWorkspaceSync(
  data: MarketingWorkspaceData,
  setData: (data: MarketingWorkspaceData) => void,
  isHydrated: boolean,
): WorkspaceSync {
  const [resolved, setResolved] = useState<{
    config: SupabaseConfig | null;
    source: SupabaseConfigSource;
  }>({ config: null, source: "none" });
  const [status, setStatus] = useState<SyncStatus>("local-only");
  const [lastError, setLastError] = useState("");
  const [needsMigration, setNeedsMigration] = useState(false);
  const [initialPullDone, setInitialPullDone] = useState(false);

  const pulledRef = useRef(false);
  const skipNextPushRef = useRef(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Throttle for automatic history snapshots: at most one every 5 minutes.
  const lastSnapshotAtRef = useRef(0);

  const config = resolved.config;
  const isConfigured = config !== null;

  // Resolve credentials on the client only, to keep server and first client
  // render identical and avoid hydration mismatches.
  useEffect(() => {
    const next = resolveSupabaseConfig();
    setResolved(next);

    if (!next.config) {
      setStatus("local-only");
    }
  }, []);

  // Initial pull once local data has hydrated and credentials are known.
  useEffect(() => {
    if (!isHydrated || !config || pulledRef.current) {
      return;
    }

    pulledRef.current = true;
    let cancelled = false;
    setStatus("connecting");

    fetchWorkspaceState(config)
      .then((row) => {
        if (cancelled) {
          return;
        }

        if (row) {
          skipNextPushRef.current = true;
          // Cloud data may predate fields added to the workspace shape since
          // it was last saved, so it goes through the same upgrade path as
          // data loaded from localStorage.
          setData(normalizeWorkspaceData(row.data));
          setStatus("synced");
        } else {
          // Cloud row is empty: offer the one-time migration of local data.
          setNeedsMigration(true);
          setStatus("synced");
        }
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setLastError(error instanceof Error ? error.message : String(error));
        setStatus("offline");
      })
      .finally(() => {
        if (!cancelled) {
          setInitialPullDone(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isHydrated, config, setData]);

  // Debounced push on change. Never runs before the initial pull completes, so
  // local data cannot overwrite a newer cloud snapshot on startup.
  useEffect(() => {
    if (!isHydrated || !config || !initialPullDone || needsMigration) {
      return;
    }

    if (skipNextPushRef.current) {
      skipNextPushRef.current = false;
      return;
    }

    if (pushTimer.current) {
      clearTimeout(pushTimer.current);
    }

    setStatus("saving");
    pushTimer.current = setTimeout(() => {
      upsertWorkspaceState(config, data)
        .then(() => {
          setStatus("synced");
          setLastError("");

          // Automatic history snapshot, throttled. Failures here are
          // non-fatal (the main save already succeeded); the manual
          // "Save a version now" button reports snapshot errors honestly.
          const now = Date.now();

          if (now - lastSnapshotAtRef.current > 5 * 60_000) {
            lastSnapshotAtRef.current = now;
            insertWorkspaceSnapshot(config, data)
              .then(() => pruneWorkspaceSnapshots(config))
              .catch(() => {
                // Retry sooner next time rather than waiting the full window.
                lastSnapshotAtRef.current = 0;
              });
          }
        })
        .catch((error) => {
          setLastError(error instanceof Error ? error.message : String(error));
          setStatus("offline");
        });
    }, PUSH_DEBOUNCE_MS);

    return () => {
      if (pushTimer.current) {
        clearTimeout(pushTimer.current);
      }
    };
  }, [data, isHydrated, config, initialPullDone, needsMigration]);

  const copyLocalToCloud = useCallback(async () => {
    if (!config) {
      return;
    }

    setStatus("saving");

    try {
      await upsertWorkspaceState(config, data);
      setNeedsMigration(false);
      setStatus("synced");
      setLastError("");
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
      setStatus("error");
    }
  }, [config, data]);

  const reloadFromCloud = useCallback(async () => {
    if (!config) {
      return;
    }

    setStatus("connecting");

    try {
      const row = await fetchWorkspaceState(config);

      if (row) {
        skipNextPushRef.current = true;
        setData(normalizeWorkspaceData(row.data));
        setNeedsMigration(false);
        setStatus("synced");
        setLastError("");
      } else {
        setNeedsMigration(true);
        setStatus("synced");
      }
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
      setStatus("error");
    }
  }, [config, setData]);

  const testConnection = useCallback(async (candidate: SupabaseConfig) => {
    const result = await testWorkspaceConnection(candidate);
    return result.ok ? { ok: true } : { ok: false, error: result.error };
  }, []);

  const saveConfigAndReload = useCallback((candidate: SupabaseConfig) => {
    saveSupabaseConfig(candidate);

    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }, []);

  const clearConfigAndReload = useCallback(() => {
    clearSupabaseConfig();

    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }, []);

  const saveSnapshotNow = useCallback(async () => {
    if (!config) {
      return { ok: false, error: "Connect Supabase first." };
    }

    try {
      await insertWorkspaceSnapshot(config, data);
      await pruneWorkspaceSnapshots(config);
      lastSnapshotAtRef.current = Date.now();
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }, [config, data]);

  const listSnapshots = useCallback(async () => {
    if (!config) {
      return { ok: false as const, error: "Connect Supabase first." };
    }

    try {
      const snapshots = await listWorkspaceSnapshots(config);
      return { ok: true as const, snapshots };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }, [config]);

  const restoreSnapshot = useCallback(
    async (id: string) => {
      if (!config) {
        return { ok: false, error: "Connect Supabase first." };
      }

      try {
        const snapshot = await fetchWorkspaceSnapshot(config, id);

        if (!snapshot) {
          return { ok: false, error: "That version could not be found." };
        }

        // Restored data becomes the working state and syncs like any edit.
        setData(normalizeWorkspaceData(snapshot));
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    [config, setData],
  );

  return {
    status,
    source: resolved.source,
    isConfigured,
    lastError,
    needsMigration,
    copyLocalToCloud,
    reloadFromCloud,
    testConnection,
    saveConfigAndReload,
    clearConfigAndReload,
    saveSnapshotNow,
    listSnapshots,
    restoreSnapshot,
  };
}
