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
      return NextResponse.json({ ok: false, error: result.error });
    }

    return NextResponse.json({ ok: true, accountLabel: result.value.accountLabel });
  }

  if (body.action === "sync") {
    const result = await syncMetricoolMetrics(credentials);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error });
    }

    return NextResponse.json({
      ok: true,
      metrics: result.value.metrics,
      skippedNetworks: result.value.skippedNetworks,
    });
  }

  return NextResponse.json(
    { ok: false, error: "Unknown action. Use 'test' or 'sync'." },
    { status: 400 },
  );
}
