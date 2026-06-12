"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getObjects, getFields } from "@/lib/metadata";
import { Icon } from "@/lib/icons";
import { BarChart, DonutChart } from "@/components/Charts";
import { runReport, type ReportResult } from "@/lib/reports";
import { useToast } from "@/components/Toast";
import type { SfReport, SfObject, SfField } from "@/lib/types";

export default function ReportBuilder() {
  const id = String(useParams().id);
  const router = useRouter();
  const toast = useToast();
  const [report, setReport] = useState<SfReport | null>(null);
  const [objects, setObjects] = useState<SfObject[]>([]);
  const [fields, setFields] = useState<SfField[]>([]);
  const [result, setResult] = useState<ReportResult | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("sf_reports").select("*").eq("id", id).single();
      setReport(data as SfReport);
      setObjects(await getObjects());
    })();
  }, [id]);

  useEffect(() => {
    if (report?.object_id) getFields(report.object_id).then(setFields);
  }, [report?.object_id]);

  const run = useCallback(async () => {
    if (report) setResult(await runReport(report));
  }, [report]);
  useEffect(() => { if (report && fields.length) run(); }, [report, fields, run]);

  function patch(p: Partial<SfReport>) { setReport((r) => (r ? { ...r, ...p } : r)); }

  async function save() {
    if (!report) return;
    await supabase.from("sf_reports").update({
      name: report.name, object_id: report.object_id, group_field: report.group_field,
      measure: report.measure, measure_field: report.measure_field, chart: report.chart, filters: report.filters,
    }).eq("id", id);
    toast("Report saved", "success");
  }

  if (!report) return <div className="center-screen" style={{ minHeight: "50vh" }}><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="record-header">
        <button className="btn-icon" onClick={() => router.push("/reports")}><Icon name="ArrowLeft" /></button>
        <span className="record-icon" style={{ background: "#e9696e" }}><Icon name="TrendingUp" size={20} /></span>
        <div><div className="eyebrow">Report</div><input value={report.name} onChange={(e) => patch({ name: e.target.value })} style={{ fontWeight: 700, fontSize: "1.05rem", width: 320 }} /></div>
        <button className="btn btn-brand ml-auto" onClick={save}><Icon name="Save" size={14} /> Save</button>
      </div>

      <div className="card mb"><div className="card-body">
        <div className="form-grid">
          <div className="field"><label>Object</label>
            <select value={report.object_id || ""} onChange={(e) => patch({ object_id: e.target.value, group_field: null })}>
              {objects.map((o) => <option key={o.id} value={o.id}>{o.plural_label}</option>)}
            </select>
          </div>
          <div className="field"><label>Group By</label>
            <select value={report.group_field || ""} onChange={(e) => patch({ group_field: e.target.value })}>
              <option value="">--None--</option>
              {fields.map((f) => <option key={f.id} value={f.api_name}>{f.label}</option>)}
            </select>
          </div>
          <div className="field"><label>Measure</label>
            <select value={report.measure} onChange={(e) => patch({ measure: e.target.value as any })}>
              <option value="count">Record Count</option><option value="sum">Sum of Field</option>
            </select>
          </div>
          {report.measure === "sum" && (
            <div className="field"><label>Sum Field</label>
              <select value={report.measure_field || ""} onChange={(e) => patch({ measure_field: e.target.value })}>
                <option value="">--Select--</option>
                {fields.filter((f) => ["number", "currency", "percent"].includes(f.type)).map((f) => <option key={f.id} value={f.api_name}>{f.label}</option>)}
              </select>
            </div>
          )}
          <div className="field"><label>Chart</label>
            <select value={report.chart} onChange={(e) => patch({ chart: e.target.value as any })}>
              <option value="bar">Bar</option><option value="donut">Donut</option><option value="table">Table only</option>
            </select>
          </div>
        </div>
      </div></div>

      <div className="card">
        <div className="card-header"><Icon name="TrendingUp" size={16} /><h3>{report.name} — {result?.total ?? 0} total</h3></div>
        <div className="card-body">
          {!result ? <div className="spinner" /> : (
            <>
              {report.chart === "bar" && result.chartData.length > 0 && <BarChart data={result.chartData} height={280} />}
              {report.chart === "donut" && result.chartData.length > 0 && <DonutChart data={result.chartData} size={240} />}
              <div className="table-wrap mt">
                <table className="data-table">
                  <thead><tr><th>{report.group_field || "Group"}</th><th>{report.measure === "sum" ? `Sum of ${report.measure_field}` : "Count"}</th></tr></thead>
                  <tbody>
                    {result.chartData.map((d) => <tr key={d.label}><td>{d.label}</td><td>{report.measure === "sum" ? `$${d.value.toLocaleString()}` : d.value}</td></tr>)}
                    {!result.chartData.length && <tr><td colSpan={2} className="muted">No data.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
