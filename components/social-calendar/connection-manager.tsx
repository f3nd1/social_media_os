"use client";

import { useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Plug,
  Plus,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  buildPdfMetricReviewRows,
  countDetectedPdfMetrics,
  getPdfConfidenceLevel,
  metricLabel,
  pdfReviewMetricFields,
  reviewRowsToPlatformMetrics,
  type PendingMetricReview,
} from "@/lib/pdf-data-import";
import { parseMetricoolCsv } from "@/lib/metricool-csv";
import {
  CONNECTION_AGGREGATOR_SOURCES,
  CONNECTION_AVAILABLE_MODES,
  CONNECTION_CREDENTIAL_FIELDS,
  CONNECTION_IMPLEMENTED_SOURCES,
  CONNECTION_MANUAL_ONLY_NOTE,
  CONNECTION_SOURCE_LABELS,
  connectionSources,
  type ConnectionMode,
  type ConnectionSource,
  type PdfMetricReview,
  type PlatformConnection,
} from "@/lib/social-calendar-data";

type ActionMessage = {
  tone: "success" | "error" | "info";
  text: string;
};

type ConnectionManagerPanelProps = {
  connections: PlatformConnection[];
  onConnectionsChange: (connections: PlatformConnection[]) => void;
  onSyncReview: (pending: PendingMetricReview) => void;
};

export function ConnectionManagerPanel({
  connections: connectionsProp,
  onConnectionsChange,
  onSyncReview,
}: ConnectionManagerPanelProps) {
  // Defensive default: workspace snapshots saved before this field existed
  // (for example an older Supabase sync) should upgrade on load, but this
  // keeps the panel safe even if one somehow arrives without it.
  const connections = connectionsProp ?? [];
  const [flowOpen, setFlowOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionMessages, setActionMessages] = useState<Record<string, ActionMessage>>({});
  const [pendingAction, setPendingAction] = useState<Record<string, "testing" | "syncing">>({});

  function setMessage(id: string, tone: ActionMessage["tone"], text: string) {
    setActionMessages((current) => ({ ...current, [id]: { tone, text } }));
  }

  function openAddFlow() {
    setEditingId(null);
    setFlowOpen(true);
  }

  function openEditFlow(connectionId: string) {
    setEditingId(connectionId);
    setFlowOpen(true);
  }

  function closeFlow() {
    setFlowOpen(false);
    setEditingId(null);
  }

  function saveConnection(connection: PlatformConnection) {
    const exists = connections.some((row) => row.id === connection.id);
    onConnectionsChange(
      exists
        ? connections.map((row) => (row.id === connection.id ? connection : row))
        : [...connections, connection],
    );
    closeFlow();
  }

  function removeConnection(connection: PlatformConnection) {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        `Remove the ${CONNECTION_SOURCE_LABELS[connection.source]} connection "${
          connection.accountLabel || "Unnamed"
        }"? Stored credentials will be deleted.`,
      );

      if (!confirmed) {
        return;
      }
    }

    onConnectionsChange(connections.filter((row) => row.id !== connection.id));
  }

  async function handleTest(connection: PlatformConnection) {
    if (!CONNECTION_IMPLEMENTED_SOURCES.includes(connection.source)) {
      setMessage(connection.id, "info", "Test not yet available for this platform.");
      return;
    }

    setPendingAction((current) => ({ ...current, [connection.id]: "testing" }));

    try {
      const response = await fetch("/api/metricool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", credentials: connection.credentials }),
      });
      const result = (await response.json()) as
        | { ok: true; accountLabel: string }
        | { ok: false; error: string };

      if (result.ok) {
        onConnectionsChange(
          connections.map((row) =>
            row.id === connection.id ? { ...row, status: "connected", lastError: "" } : row,
          ),
        );
        setMessage(connection.id, "success", `Connected. Metricool account: ${result.accountLabel}.`);
      } else {
        onConnectionsChange(
          connections.map((row) =>
            row.id === connection.id ? { ...row, status: "error", lastError: result.error } : row,
          ),
        );
        setMessage(connection.id, "error", result.error);
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      onConnectionsChange(
        connections.map((row) =>
          row.id === connection.id ? { ...row, status: "error", lastError: messageText } : row,
        ),
      );
      setMessage(connection.id, "error", messageText);
    } finally {
      setPendingAction((current) => {
        const next = { ...current };
        delete next[connection.id];
        return next;
      });
    }
  }

  async function handleSync(connection: PlatformConnection) {
    if (!CONNECTION_IMPLEMENTED_SOURCES.includes(connection.source)) {
      setMessage(connection.id, "info", "Sync engine not yet built. Use CSV/PDF import.");
      return;
    }

    setPendingAction((current) => ({ ...current, [connection.id]: "syncing" }));

    try {
      const response = await fetch("/api/metricool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync", credentials: connection.credentials }),
      });
      const result = (await response.json()) as
        | {
            ok: true;
            metrics: Parameters<typeof buildPdfMetricReviewRows>[0];
            skippedNetworks: string[];
          }
        | { ok: false; error: string };

      if (!result.ok) {
        onConnectionsChange(
          connections.map((row) =>
            row.id === connection.id ? { ...row, status: "error", lastError: result.error } : row,
          ),
        );
        setMessage(connection.id, "error", result.error);
        return;
      }

      onConnectionsChange(
        connections.map((row) =>
          row.id === connection.id
            ? {
                ...row,
                status: "connected",
                lastError: "",
                lastSyncAt: new Date().toISOString(),
              }
            : row,
        ),
      );

      if (result.metrics.length === 0) {
        setMessage(
          connection.id,
          "info",
          "Sync completed but returned no metrics for the networks connected in Metricool.",
        );
        return;
      }

      onSyncReview({
        rows: buildPdfMetricReviewRows(result.metrics, "metricool-sync"),
        sourceLabel: `Metricool API sync (${connection.accountLabel || "connected brand"})`,
        noteLabel: "Metricool sync",
        rangeLabel: "last 30 days",
      });

      const skippedNote =
        result.skippedNetworks.length > 0
          ? ` Skipped (not tracked in Metricool): ${result.skippedNetworks.join(", ")}.`
          : "";
      setMessage(
        connection.id,
        "success",
        `Pulled data for ${result.metrics.length} network${
          result.metrics.length === 1 ? "" : "s"
        }. Review and approve below before it applies.${skippedNote}`,
      );
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      onConnectionsChange(
        connections.map((row) =>
          row.id === connection.id ? { ...row, status: "error", lastError: messageText } : row,
        ),
      );
      setMessage(connection.id, "error", messageText);
    } finally {
      setPendingAction((current) => {
        const next = { ...current };
        delete next[connection.id];
        return next;
      });
    }
  }

  async function handleMetricoolCsvFile(connection: PlatformConnection, file: File) {
    const text = await file.text();
    const result = parseMetricoolCsv(text);

    if (!result.ok) {
      setMessage(
        connection.id,
        "error",
        `${result.error} Headers found in the file: ${
          result.foundHeaders.length > 0 ? result.foundHeaders.join(", ") : "none"
        }.`,
      );
      return;
    }

    onSyncReview({
      rows: buildPdfMetricReviewRows(result.metrics, "metricool-csv"),
      sourceLabel: `Metricool CSV import (${file.name})`,
      noteLabel: "Metricool CSV import",
      rangeLabel: "the date range in the CSV export",
    });
    setMessage(
      connection.id,
      "success",
      `Parsed ${result.metrics.length} network${
        result.metrics.length === 1 ? "" : "s"
      } from ${file.name}. Review and approve below before it applies.`,
    );
  }

  const editingConnection = editingId
    ? connections.find((row) => row.id === editingId) ?? null
    : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
              <Plug className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <Badge variant="outline">Connections</Badge>
              <CardTitle className="mt-2">Live Platform Data Connections</CardTitle>
              <CardDescription className="mt-2 max-w-3xl leading-6">
                Connect Metricool or an individual platform. Real credentials
                are stored, and Test and Sync only ever report what actually
                happened, never a placeholder result.
              </CardDescription>
            </div>
          </div>
          {connections.length > 0 ? (
            <Button onClick={openAddFlow} size="sm" type="button">
              <Plus className="h-4 w-4" />
              Add connection
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {connections.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-background text-primary">
              <Plug className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-semibold">No platforms connected yet</h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              Add Metricool or a single platform to bring in real analytics.
            </p>
            <Button className="mt-4" onClick={openAddFlow} type="button">
              <Plus className="h-4 w-4" />
              Add connection
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {connections.map((connection) => (
              <ConnectionRow
                connection={connection}
                key={connection.id}
                message={actionMessages[connection.id]}
                pendingAction={pendingAction[connection.id]}
                onCsvFile={(file) => void handleMetricoolCsvFile(connection, file)}
                onEdit={() => openEditFlow(connection.id)}
                onRemove={() => removeConnection(connection)}
                onSync={() => void handleSync(connection)}
                onTest={() => void handleTest(connection)}
              />
            ))}
          </div>
        )}
      </CardContent>

      {flowOpen ? (
        <ConnectionFlow
          existingConnection={editingConnection}
          onCancel={closeFlow}
          onSave={saveConnection}
        />
      ) : null}
    </Card>
  );
}

function ConnectionRow({
  connection,
  message,
  onCsvFile,
  onEdit,
  onRemove,
  onSync,
  onTest,
  pendingAction,
}: {
  connection: PlatformConnection;
  message?: ActionMessage;
  onCsvFile: (file: File) => void;
  onEdit: () => void;
  onRemove: () => void;
  onSync: () => void;
  onTest: () => void;
  pendingAction?: "testing" | "syncing";
}) {
  const statusDisplay = getConnectionStatusDisplay(connection);
  const isImplemented = CONNECTION_IMPLEMENTED_SOURCES.includes(connection.source);

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">
              {CONNECTION_SOURCE_LABELS[connection.source]}
            </p>
            <Badge variant="outline">
              {connection.mode === "direct API" ? "Direct API" : "CSV/PDF"}
            </Badge>
            <Badge variant={statusDisplay.variant}>{statusDisplay.label}</Badge>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {connection.accountLabel || "No account label set"}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Last sync:{" "}
            {connection.lastSyncAt ? formatDateTimeLabel(connection.lastSyncAt) : "Never synced"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={pendingAction === "testing"}
            onClick={onTest}
            size="sm"
            type="button"
            variant="outline"
          >
            {pendingAction === "testing" ? "Testing" : "Test"}
          </Button>
          <Button
            disabled={pendingAction === "syncing"}
            onClick={onSync}
            size="sm"
            type="button"
            variant="outline"
          >
            <RefreshCcw className="h-4 w-4" />
            {pendingAction === "syncing" ? "Syncing" : "Sync now"}
          </Button>
          <Button onClick={onEdit} size="sm" type="button" variant="outline">
            Edit
          </Button>
          <Button onClick={onRemove} size="sm" type="button" variant="outline">
            <Trash2 className="h-4 w-4" />
            Remove
          </Button>
        </div>
      </div>

      {connection.source === "metricool" ? (
        <label className="flex w-fit cursor-pointer items-center gap-2 rounded-md border border-dashed bg-background px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted">
          <Upload className="h-3.5 w-3.5" />
          Import Metricool CSV
          <input
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                onCsvFile(file);
              }

              event.target.value = "";
            }}
            type="file"
          />
        </label>
      ) : null}

      {!isImplemented && connection.mode === "direct API" ? (
        <p className="text-xs leading-5 text-muted-foreground">
          Credentials are stored for when this sync engine is built. Use
          CSV/PDF import in the meantime.
        </p>
      ) : null}

      {message ? (
        <p
          className={cn(
            "text-xs leading-5",
            message.tone === "success" && "text-success-foreground",
            message.tone === "error" && "text-warning-foreground",
            message.tone === "info" && "text-muted-foreground",
          )}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}

function getConnectionStatusDisplay(
  connection: PlatformConnection,
): { label: string; variant: BadgeProps["variant"] } {
  if (connection.mode === "CSV/PDF import") {
    return { label: "Manual import", variant: "secondary" };
  }

  if (connection.status === "connected") {
    return { label: "Connected", variant: "success" };
  }

  if (connection.status === "error") {
    return { label: "Error", variant: "warning" };
  }

  const requiredFields = CONNECTION_CREDENTIAL_FIELDS[connection.source];
  const hasAllFields = requiredFields.every((field) =>
    connection.credentials[field.key]?.trim(),
  );

  if (!hasAllFields) {
    return { label: "Needs credentials", variant: "warning" };
  }

  return { label: "Not tested yet", variant: "secondary" };
}

function formatDateTimeLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function ConnectionFlow({
  existingConnection,
  onCancel,
  onSave,
}: {
  existingConnection: PlatformConnection | null;
  onCancel: () => void;
  onSave: (connection: PlatformConnection) => void;
}) {
  const [step, setStep] = useState<"source" | "mode" | "details">(
    existingConnection ? "mode" : "source",
  );
  const [source, setSource] = useState<ConnectionSource | null>(
    existingConnection?.source ?? null,
  );
  const [mode, setMode] = useState<ConnectionMode | null>(existingConnection?.mode ?? null);
  const [accountLabel, setAccountLabel] = useState(existingConnection?.accountLabel ?? "");
  const [credentials, setCredentials] = useState<Record<string, string>>(
    existingConnection?.credentials ?? {},
  );

  const aggregators = connectionSources.filter((candidate) =>
    CONNECTION_AGGREGATOR_SOURCES.includes(candidate),
  );
  const singlePlatforms = connectionSources.filter(
    (candidate) => !CONNECTION_AGGREGATOR_SOURCES.includes(candidate),
  );

  function chooseSource(next: ConnectionSource) {
    setSource(next);
    setMode(null);
    setCredentials({});
    setStep("mode");
  }

  function chooseMode(next: ConnectionMode) {
    setMode(next);
    setStep("details");
  }

  function finish() {
    if (!source || !mode) {
      return;
    }

    const status =
      mode === "CSV/PDF import"
        ? ("manual import" as const)
        : ("needs credentials" as const);

    onSave({
      id: existingConnection?.id ?? `connection-${Date.now()}`,
      source,
      accountLabel: accountLabel.trim(),
      mode,
      status: existingConnection ? existingConnection.status : status,
      credentials,
      lastSyncAt: existingConnection?.lastSyncAt ?? "",
      lastError: existingConnection?.lastError ?? "",
      createdAt: existingConnection?.createdAt ?? new Date().toISOString(),
    });
  }

  const availableModes = source ? CONNECTION_AVAILABLE_MODES[source] : [];
  const credentialFields = source ? CONNECTION_CREDENTIAL_FIELDS[source] : [];
  const manualOnlyNote = source ? CONNECTION_MANUAL_ONLY_NOTE[source] : undefined;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-background/60 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l bg-card p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Step {step === "source" ? 1 : step === "mode" ? 2 : 3} of 3
            </p>
            <h3 className="text-base font-semibold">
              {existingConnection ? "Edit connection" : "Add connection"}
            </h3>
          </div>
          <Button aria-label="Close" onClick={onCancel} size="icon" type="button" variant="outline">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {step === "source" ? (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                Aggregator
              </p>
              <div className="grid gap-2">
                {aggregators.map((candidate) => (
                  <SourceOption
                    key={candidate}
                    label={CONNECTION_SOURCE_LABELS[candidate]}
                    onClick={() => chooseSource(candidate)}
                    recommended
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                Platforms
              </p>
              <div className="grid grid-cols-2 gap-2">
                {singlePlatforms.map((candidate) => (
                  <SourceOption
                    key={candidate}
                    label={CONNECTION_SOURCE_LABELS[candidate]}
                    onClick={() => chooseSource(candidate)}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {step === "mode" && source ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">
              {CONNECTION_SOURCE_LABELS[source]}: choose how data comes in
            </p>
            {availableModes.length === 1 ? (
              <p className="text-xs leading-5 text-muted-foreground">
                {manualOnlyNote ??
                  "This source only supports CSV/PDF import for now."}
              </p>
            ) : null}
            <div className="grid gap-2">
              {availableModes.includes("direct API") ? (
                <ModeOption
                  description="Store credentials and use the sync engine where one exists."
                  label="Direct API"
                  onClick={() => chooseMode("direct API")}
                />
              ) : null}
              {availableModes.includes("CSV/PDF import") ? (
                <ModeOption
                  description="Upload exported analytics files instead of connecting an API."
                  label="CSV/PDF import"
                  onClick={() => chooseMode("CSV/PDF import")}
                />
              ) : null}
            </div>
            <Button onClick={() => setStep("source")} size="sm" type="button" variant="outline">
              Back
            </Button>
          </div>
        ) : null}

        {step === "details" && source && mode ? (
          <div className="space-y-4">
            <FlowField label="Account label">
              <Input
                onChange={(event) => setAccountLabel(event.target.value)}
                placeholder="e.g. UCC main brand"
                value={accountLabel}
              />
            </FlowField>

            {mode === "direct API" && credentialFields.length > 0 ? (
              <div className="space-y-3">
                {credentialFields.map((field) => (
                  <FlowField key={field.key} label={field.label}>
                    <Input
                      onChange={(event) =>
                        setCredentials((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))
                      }
                      type={field.secret ? "password" : "text"}
                      value={credentials[field.key] ?? ""}
                    />
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {field.helper}
                    </p>
                  </FlowField>
                ))}
              </div>
            ) : null}

            {mode === "CSV/PDF import" ? (
              <p className="text-xs leading-5 text-muted-foreground">
                No credentials needed. Use the Import CSV button on the
                connection card once it is saved.
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button onClick={finish} type="button">
                Save connection
              </Button>
              <Button
                onClick={() => setStep("mode")}
                size="sm"
                type="button"
                variant="outline"
              >
                Back
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SourceOption({
  label,
  onClick,
  recommended,
}: {
  label: string;
  onClick: () => void;
  recommended?: boolean;
}) {
  return (
    <button
      className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-3 text-left text-sm font-medium transition-colors hover:bg-muted"
      onClick={onClick}
      type="button"
    >
      {label}
      {recommended ? <Badge variant="success">Recommended</Badge> : null}
    </button>
  );
}

function ModeOption({
  description,
  label,
  onClick,
}: {
  description: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="rounded-md border bg-background px-3 py-3 text-left transition-colors hover:bg-muted"
      onClick={onClick}
      type="button"
    >
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
    </button>
  );
}

function FlowField({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

export function MetricReviewPanel({
  approverName,
  onApply,
  onApproverNameChange,
  onDiscard,
  onRowChange,
  pending,
}: {
  approverName: string;
  onApply: () => void;
  onApproverNameChange: (value: string) => void;
  onDiscard: () => void;
  onRowChange: (rowId: string, patch: Partial<PdfMetricReview>) => void;
  pending: PendingMetricReview;
}) {
  const metricCount = countDetectedPdfMetrics(pending.rows);
  const confidenceLevel = getPdfConfidenceLevel(pending.rows);
  const approvedCount = pending.rows.filter((row) => row.approved).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <Badge variant="outline">Review before applying</Badge>
              <CardTitle className="mt-2">{pending.sourceLabel}</CardTitle>
              <CardDescription className="mt-2 max-w-3xl leading-6">
                Approve the rows below to apply them to Social Audit, KPI
                Tracker, and the import log. Nothing applies until you approve
                it here.
              </CardDescription>
            </div>
          </div>
          <Badge
            variant={
              confidenceLevel === "high"
                ? "success"
                : confidenceLevel === "medium"
                  ? "info"
                  : "warning"
            }
          >
            {confidenceLevel} confidence
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FlowField label="Approved by">
            <Input
              onChange={(event) => onApproverNameChange(event.target.value)}
              placeholder="Your name"
              value={approverName}
            />
          </FlowField>
          <p className="self-end text-xs leading-5 text-muted-foreground">
            {pending.rows.length} network row{pending.rows.length === 1 ? "" : "s"}, {metricCount}{" "}
            metric value{metricCount === 1 ? "" : "s"} detected.
          </p>
        </div>

        {pending.rows.length === 0 ? (
          <div className="flex min-h-32 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 p-6 text-center">
            <AlertTriangle className="h-6 w-6 text-primary" />
            <h3 className="mt-3 text-sm font-semibold">No rows to review</h3>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-xs">
              <thead className="border-b uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3 font-medium">Apply</th>
                  <th className="py-2 pr-3 font-medium">Platform</th>
                  <th className="py-2 pr-3 font-medium">Confidence</th>
                  {pdfReviewMetricFields.map((field) => (
                    <th className="py-2 pr-3 font-medium" key={field}>
                      {metricLabel(field)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {pending.rows.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2 pr-3">
                      <input
                        aria-label={`Approve ${row.platform} metrics`}
                        checked={row.approved}
                        onChange={(event) =>
                          onRowChange(row.id, { approved: event.target.checked })
                        }
                        type="checkbox"
                      />
                    </td>
                    <td className="whitespace-nowrap py-2 pr-3 font-medium">{row.platform}</td>
                    <td className="whitespace-nowrap py-2 pr-3">{row.confidence}%</td>
                    {pdfReviewMetricFields.map((field) => (
                      <td className="min-w-[86px] py-2 pr-3" key={field}>
                        <Input
                          className="h-8"
                          onChange={(event) =>
                            onRowChange(row.id, {
                              [field]: Number(event.target.value) || 0,
                            } as Partial<PdfMetricReview>)
                          }
                          type="number"
                          value={row[field]}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={approvedCount === 0 || !approverName.trim()}
            onClick={onApply}
            type="button"
          >
            Apply {approvedCount} approved row{approvedCount === 1 ? "" : "s"}
          </Button>
          <Button onClick={onDiscard} size="sm" type="button" variant="outline">
            Discard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function reviewRowsToApprovedMetrics(rows: PdfMetricReview[]) {
  return reviewRowsToPlatformMetrics(rows.filter((row) => row.approved));
}
