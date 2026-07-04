import { NextResponse } from "next/server";

import {
  syncMetricoolMetrics,
  testMetricoolConnection,
  type MetricoolCredentials,
} from "@/lib/metricool";

export const runtime = "nodejs";

type MetricoolRequestBody = {
  action?: "test" | "sync";
  credentials?: Partial<MetricoolCredentials>;
  // 7, 30, or 90; anything else falls back to 30.
  rangeDays?: number;
};

function readCredentials(body: MetricoolRequestBody) {
  const apiToken = body.credentials?.apiToken?.trim();
  const userId = body.credentials?.userId?.trim();
  const blogId = body.credentials?.blogId?.trim();

  if (!apiToken || !userId || !blogId) {
    return null;
  }

  return { apiToken, userId, blogId };
}

export async function POST(request: Request) {
  let body: MetricoolRequestBody;

  try {
    body = (await request.json()) as MetricoolRequestBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const credentials = readCredentials(body);

  if (!credentials) {
    return NextResponse.json(
      { ok: false, error: "API token, User ID, and Blog ID are all required." },
      { status: 400 },
    );
  }

  if (body.action === "test") {
    const result = await testMetricoolConnection(credentials);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error, status: result.status });
    }

    return NextResponse.json({ ok: true, accountLabel: result.value.accountLabel });
  }

  if (body.action === "sync") {
    const result = await syncMetricoolMetrics(credentials, body.rangeDays ?? 30);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error, status: result.status });
    }

    return NextResponse.json({
      ok: true,
      metrics: result.value.metrics,
      skippedNetworks: result.value.skippedNetworks,
      report: result.value.report,
    });
  }

  return NextResponse.json(
    { ok: false, error: "Unknown action. Use 'test' or 'sync'." },
    { status: 400 },
  );
}
