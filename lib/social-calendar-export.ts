import {
  analyzePerformance,
  platforms,
  type CalendarItem,
  type MarketingWorkspaceData,
  type PerformanceResult,
} from "@/lib/social-calendar-data";

type ExportValue = string | number | boolean | null | undefined;
type ExportRow = Record<string, ExportValue>;

export type ExportSheet = {
  name: string;
  rows: ExportRow[];
};

export function buildExportSheets(data: MarketingWorkspaceData): ExportSheet[] {
  const analytics = analyzePerformance(data);
  const performanceByItem = new Map(
    data.performanceResults.map((result) => [result.calendarItemId, result]),
  );

  const overviewRows: ExportRow[] = [
    { Metric: "Brand", Value: data.brand.brandName },
    { Metric: "Website", Value: data.brand.website },
    { Metric: "Industry", Value: data.brand.industry },
    { Metric: "Social goal", Value: data.socialGoals.primaryObjective },
    { Metric: "Campaign window", Value: data.socialGoals.campaignWindow },
    { Metric: "Funnel stage", Value: data.socialGoals.funnelStage },
    { Metric: "Conversion action", Value: data.socialGoals.conversionAction },
    {
      Metric: "Priority platforms",
      Value: data.socialGoals.priorityPlatforms.join(" | "),
    },
    { Metric: "Monthly campaign goal", Value: data.brief.monthlyCampaignGoal },
    { Metric: "Brief approved", Value: data.brief.approved ? "Yes" : "No" },
    { Metric: "Calendar items", Value: data.calendar.length },
    { Metric: "UCC courses", Value: data.ucc.courses.length },
    { Metric: "UCC campaigns", Value: data.ucc.campaigns.length },
    { Metric: "Budget planned", Value: data.ucc.budgetPlans.reduce((sum, budget) => sum + budget.totalCost, 0) },
    { Metric: "Platforms audited", Value: data.audits.length },
    { Metric: "Competitors tracked", Value: data.competitors.length },
    {
      Metric: "Top platform",
      Value: analytics.topPlatform?.label ?? "No performance data",
    },
    {
      Metric: "Top content pillar",
      Value: analytics.topPillar?.label ?? "No performance data",
    },
    {
      Metric: "Compliance reminders",
      Value: data.brief.complianceReminders.join(" | "),
    },
  ];

  const goalRows: ExportRow[] = [
    { Field: "Primary objective", Value: data.socialGoals.primaryObjective },
    { Field: "Campaign window", Value: data.socialGoals.campaignWindow },
    { Field: "Funnel stage", Value: data.socialGoals.funnelStage },
    { Field: "Target audience", Value: data.socialGoals.targetAudienceSegment },
    { Field: "Conversion action", Value: data.socialGoals.conversionAction },
    {
      Field: "Priority platforms",
      Value: data.socialGoals.priorityPlatforms.join(" | "),
    },
    {
      Field: "Content priorities",
      Value: data.socialGoals.contentPriorities.join(" | "),
    },
    { Field: "Reporting cadence", Value: data.socialGoals.reportingCadence },
    { Field: "Notes", Value: data.socialGoals.notes },
    ...Object.entries(data.socialGoals.monthlyTargets).map(([field, value]) => ({
      Field: `Target - ${field}`,
      Value: value,
    })),
  ];

  const fullCalendarRows = data.calendar.map((item) =>
    calendarItemToExportRow(item, performanceByItem.get(item.id)),
  );

  const courseRows = data.ucc.courses.map((course) => ({
    ID: course.id,
    Course: course.name,
    Category: course.category,
    Audiences: course.audienceIds.join(" | "),
    Proof: course.courseProof.join(" | "),
    "Compliance notes": course.complianceNotes,
    Status: course.status,
  }));

  const audienceRows = data.ucc.audiences.map((audience) => ({
    ID: audience.id,
    Audience: audience.name,
    Languages: audience.languages.join(" | "),
    Motivations: audience.motivations.join(" | "),
    Concerns: audience.concerns.join(" | "),
    Channels: audience.recommendedChannels.join(" | "),
    "Nurture angle": audience.nurtureAngle,
  }));

  const campaignRows = data.ucc.campaigns.map((campaign) => ({
    ID: campaign.id,
    Campaign: campaign.name,
    Objective: campaign.objective,
    Course: campaign.courseId,
    Audience: campaign.audienceId,
    Funnel: campaign.funnelStage,
    Channels: campaign.platformMix.join(" | "),
    Start: campaign.startDate,
    End: campaign.endDate,
    Owner: campaign.owner,
    Budget: campaign.budget,
    Status: campaign.status,
    "Target reach": campaign.kpiTarget.reach,
    "Target leads": campaign.kpiTarget.leads,
    "Actual reach": campaign.actualResults.reach,
    "Actual leads": campaign.actualResults.leads,
    Spend: campaign.actualResults.spend,
  }));

  const budgetRows = data.ucc.budgetPlans.map((budget) => ({
    ID: budget.id,
    Campaign: budget.campaignId,
    "Ad budget": budget.adBudget,
    "Designer hours": budget.designerHours,
    "Video editor hours": budget.videoEditorHours,
    "Copywriter hours": budget.copywriterHours,
    Staff: budget.staffAssigned.join(" | "),
    Equipment: budget.equipmentNeeded.join(" | "),
    Venue: budget.venue,
    Printing: budget.printingCost,
    Event: budget.eventCost,
    Agent: budget.agentCost,
    Total: budget.totalCost,
  }));

  const kpiRows = data.ucc.kpiRecords.map((record) => ({
    ID: record.id,
    Campaign: record.campaignId,
    Course: record.courseId,
    Channel: record.channel,
    Leads: record.leads,
    "Agent enquiries": record.agentEnquiries,
    Applications: record.applications,
    "Campus tour bookings": record.campusTourBookings,
    Enrolments: record.enrolments,
    Spend: record.spend,
    Status: record.status,
    Recommendation: record.recommendation,
  }));

  const aiSkillRows = data.ucc.aiModules.map((module) => ({
    ID: module.id,
    Skill: module.name,
    Status: module.status,
    Purpose: module.purpose,
    "Required inputs": module.requiredInputs.join(" | "),
    "Expected output": module.expectedOutputFormat,
    "Human approval": module.humanApprovalStep,
    "Error handling": module.errorHandling,
    Guardrails: module.complianceGuardrails.join(" | "),
    "Input source": module.inputSource,
    "Output destination": module.outputDestination,
    "Last used": module.lastUsedDate,
    "Reviewer required": module.reviewerRequired ? "Yes" : "No",
    "Risk level": module.riskLevel,
    "Saved output count": module.outputHistory.length,
  }));

  const pdfImportRows = data.pdfDataSource.importLog.map((entry) => ({
    ID: entry.id,
    File: entry.fileName,
    Uploaded: entry.uploadedAt,
    Applied: entry.appliedAt,
    "Approved by": entry.approvedBy,
    "Extracted metric rows": entry.extractedMetricCount,
    "Applied metric rows": entry.appliedMetricCount,
    "Edited metric rows": entry.editedMetricCount,
    Platforms: entry.platforms.join(" | "),
    Summary: entry.summary,
  }));

  const platformSheets = platforms.map((platform) => ({
    name: `Platform - ${platform.replace("/", "-")}`,
    rows: data.calendar
      .filter((item) => item.platform === platform)
      .map((item) => calendarItemToExportRow(item, performanceByItem.get(item.id))),
  }));

  const videoRows = data.calendar
    .filter((item) => item.videoScript || item.shotNotes)
    .map((item) => ({
      Date: item.date,
      Type: item.itemKind ?? "post",
      Platform: item.platform,
      Topic: item.contentTopic,
      Format: item.format,
      Hook: item.hook,
      Script: item.videoScript,
      "Shot notes": item.shotNotes,
      "Visual direction": item.visualDirection,
      CTA: item.cta,
      Owner: item.assignedRole,
      Status: item.status,
    }));

  const weeklyRows = data.calendar.map((item, index) => ({
    Week: `Week ${Math.floor(index / 7) + 1}`,
    Date: item.date,
    Type: item.itemKind ?? "post",
    Platform: item.platform,
    Topic: item.contentTopic,
    Format: item.format,
    Owner: item.assignedRole,
    Status: item.status,
    "Best time": item.bestPostingTime,
    "Production notes": item.productionNotes,
    "Approval note": item.complianceNote,
  }));

  const performanceRows = analytics.rows.map(({ item, result, efficiency }) => ({
    Date: item.date,
    Type: item.itemKind ?? "post",
    Platform: item.platform,
    Pillar: item.contentPillar,
    Topic: item.contentTopic,
    Format: item.format,
    Hook: item.hook,
    Impressions: result.impressions,
    Reach: result.reach,
    Engagement: result.engagement,
    Comments: result.comments,
    Shares: result.shares,
    Saves: result.saves,
    "Watch time": result.watchTime,
    Clicks: result.clicks,
    "Follows gained": result.followsGained,
    "Learning score": decimalToPercent(efficiency),
    Notes: result.notes,
  }));

  return [
    { name: "Overview", rows: overviewRows },
    { name: "Goal Settings", rows: goalRows },
    { name: "Courses", rows: courseRows },
    { name: "Audiences", rows: audienceRows },
    { name: "Campaigns", rows: campaignRows },
    { name: "Budget Resources", rows: budgetRows },
    { name: "UCC KPI Tracker", rows: kpiRows },
    { name: "AI Skill Control", rows: aiSkillRows },
    { name: "PDF Import Log", rows: pdfImportRows },
    { name: "Full Calendar", rows: fullCalendarRows },
    ...platformSheets,
    { name: "Video Scripts", rows: videoRows },
    { name: "Weekly Handoff", rows: weeklyRows },
    { name: "Performance Review", rows: performanceRows },
  ];
}

export function downloadCsvPack(data: MarketingWorkspaceData) {
  const sheets = buildExportSheets(data);

  sheets.forEach((sheet, index) => {
    window.setTimeout(() => {
      downloadFile(
        `${fileSafeName(sheet.name)}.csv`,
        sheetToCsv(sheet.rows),
        "text/csv;charset=utf-8;",
      );
    }, index * 150);
  });
}

export function downloadExcelWorkbook(data: MarketingWorkspaceData) {
  const workbookXml = sheetsToExcelXml(buildExportSheets(data));

  downloadFile(
    "social-calendar-intelligence-os.xls",
    workbookXml,
    "application/vnd.ms-excel;charset=utf-8;",
  );
}

function calendarItemToExportRow(
  item: CalendarItem,
  result?: PerformanceResult,
): ExportRow {
  return {
    "Planned date": item.plannedDate ?? item.date,
    "Actual post date": item.actualPostDate,
    Date: item.date,
    Type: item.itemKind ?? "post",
    Platform: item.platform,
    Campaign: item.campaignId,
    Course: item.courseId,
    Audience: item.audienceId,
    "Content pillar": item.contentPillar,
    "Content topic": item.contentTopic,
    Format: item.format,
    Hook: item.hook,
    "Caption or copy": item.caption,
    "Visual direction": item.visualDirection,
    CTA: item.cta,
    Hashtags: item.hashtags.join(" "),
    "Best posting time": item.bestPostingTime,
    "Production notes": item.productionNotes,
    "Assigned role": item.assignedRole,
    Owner: item.owner,
    Reviewer: item.reviewer,
    "Due date": item.dueDate,
    Blocker: item.blocker,
    Status: item.status,
    "Approval stage": item.approvalStage,
    "Final caption": item.finalCaption,
    "Final asset link": item.finalAssetLink,
    "Published URL": item.publishedUrl,
    "KPI result": item.kpiResult,
    "Follow-up action": item.followUpAction,
    "Business goal connection": item.businessGoalConnection,
    "Compliance note": item.complianceNote,
    "Video script": item.videoScript,
    "Shot notes": item.shotNotes,
    Impressions: result?.impressions,
    Reach: result?.reach,
    Engagement: result?.engagement,
    Comments: result?.comments,
    Shares: result?.shares,
    Saves: result?.saves,
    Clicks: result?.clicks,
    "Follows gained": result?.followsGained,
  };
}

function sheetToCsv(rows: ExportRow[]) {
  const columns = getColumns(rows);

  if (columns.length === 0) {
    return "";
  }

  return [
    columns.map(escapeCsvValue).join(","),
    ...rows.map((row) => columns.map((column) => escapeCsvValue(row[column])).join(",")),
  ].join("\n");
}

function sheetsToExcelXml(sheets: ExportSheet[]) {
  const worksheets = sheets
    .map((sheet) => {
      const columns = getColumns(sheet.rows);
      const rows = [
        columns,
        ...sheet.rows.map((row) => columns.map((column) => row[column])),
      ];

      return `<Worksheet ss:Name="${escapeXml(trimSheetName(sheet.name))}"><Table>${rows
        .map(
          (row) =>
            `<Row>${row
              .map(
                (value) =>
                  `<Cell><Data ss:Type="${getExcelType(value)}">${escapeXml(
                    formatExportValue(value),
                  )}</Data></Cell>`,
              )
              .join("")}</Row>`,
        )
        .join("")}</Table></Worksheet>`;
    })
    .join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
${worksheets}
</Workbook>`;
}

function getColumns(rows: ExportRow[]) {
  const columns = new Set<string>();

  rows.forEach((row) => {
    Object.keys(row).forEach((column) => columns.add(column));
  });

  return [...columns];
}

function escapeCsvValue(value: ExportValue) {
  const text = formatExportValue(value);

  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

function formatExportValue(value: ExportValue) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function getExcelType(value: ExportValue) {
  return typeof value === "number" ? "Number" : "String";
}

function trimSheetName(name: string) {
  return name.replace(/[\\/?*:[\]]/g, "-").slice(0, 31);
}

function fileSafeName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function decimalToPercent(value: number) {
  return `${Math.round(value * 1000) / 10}%`;
}

function downloadFile(fileName: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
