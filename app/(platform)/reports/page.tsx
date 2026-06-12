"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getObjects } from "@/lib/metadata";
import { Icon } from "@/lib/icons";
import { useToast } from "@/components/Toast";
import type { SfReport, SfObject } from "@/lib/types";

export default function ReportsPage() {
  const [reports, setReports] = useState<SfReport[]>([]);
  const [objects, setObjects] = useState<SfObject[]>([]);
  const router = useRouter();
  const toast = useToast();

  async function reload() {
    const { data } = await supabase.from("sf_reports").select("*").order("name");
    setReports((data as SfReport[]) || []);
    setObjects(await getObjects());
  }
  useEffect(() => { reload(); }, []);

  async function create() {
    const opp = objects.find((o) => o.api_name === "Opportunity") || objects[0];
    const { data } = await supabase.from("sf_reports").insert({
      name: "New Report", object_id: opp?.id || null, group_field: "StageName", measure: "count", chart: "bar", filters: [],
    }).select().single();
    router.push(`/reports/${data.id}`);
  }

  async function del(id: string) {
    if (!confirm("Delete this report?")) return;
    await supabase.from("sf_reports").delete().eq("id", id);
    toast("Report deleted", "success");
    reload();
  }

  return (
    <div className="page">
      <div className="record-header">
        <span className="record-icon" style={{ background: "#e9696e" }}><Icon name="TrendingUp" size={20} /></span>
        <div><div className="eyebrow">Analytics</div><h1>Reports</h1></div>
        <div className="header-actions">
          <Link href="/dashboards" className="btn"><Icon name="Layout" size={14} /> Dashboards</Link>
          <button className="btn btn-brand" onClick={create}><Icon name="Plus" size={14} /> New Report</button>
        </div>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Report Name</th><th>Object</th><th>Grouped By</th><th>Measure</th><th></th></tr></thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td><Link href={`/reports/${r.id}`}><Icon name="TrendingUp" size={13} /> {r.name}</Link></td>
                <td className="muted">{objects.find((o) => o.id === r.object_id)?.label || "—"}</td>
                <td>{r.group_field || "—"}</td>
                <td>{r.measure === "sum" ? `Sum of ${r.measure_field || "Amount"}` : "Record Count"}</td>
                <td><button className="btn-icon btn-sm" onClick={() => del(r.id)}><Icon name="Trash2" size={12} /></button></td>
              </tr>
            ))}
            {!reports.length && <tr><td colSpan={5} className="muted">No reports yet. Create one to analyze your data.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
