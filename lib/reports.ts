import { listRecords } from "./records";
import { applyFilters } from "@/components/ListViewEditor";
import type { SfReport, SfRecord } from "./types";

export interface ReportResult {
  chartData: { label: string; value: number }[];
  rows: SfRecord[];
  total: number;
}

export async function runReport(report: SfReport): Promise<ReportResult> {
  if (!report.object_id) return { chartData: [], rows: [], total: 0 };
  let rows = await listRecords(report.object_id, { limit: 1000 });
  rows = applyFilters(rows, report.filters || []);

  const agg: Record<string, number> = {};
  for (const r of rows) {
    const key = report.group_field ? (r.data[report.group_field] ?? "—") : "All";
    const add = report.measure === "sum" ? Number(r.data[report.measure_field || "Amount"]) || 0 : 1;
    agg[String(key)] = (agg[String(key)] || 0) + add;
  }
  const chartData = Object.entries(agg).map(([label, value]) => ({ label, value: Math.round(value) }));
  const total = chartData.reduce((s, d) => s + d.value, 0);
  return { chartData, rows, total };
}
