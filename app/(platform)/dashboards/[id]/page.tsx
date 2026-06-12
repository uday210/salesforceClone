"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Icon } from "@/lib/icons";
import { BarChart, DonutChart } from "@/components/Charts";
import { runReport } from "@/lib/reports";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import type { SfDashboard, SfReport, DashboardWidget } from "@/lib/types";

export default function DashboardView() {
  const id = String(useParams().id);
  const router = useRouter();
  const toast = useToast();
  const [dash, setDash] = useState<SfDashboard | null>(null);
  const [reports, setReports] = useState<SfReport[]>([]);
  const [data, setData] = useState<Record<string, { label: string; value: number }[]>>({});
  const [add, setAdd] = useState(false);
  const [edit, setEdit] = useState(false);

  async function load() {
    const { data: d } = await supabase.from("sf_dashboards").select("*").eq("id", id).single();
    setDash(d as SfDashboard);
    const { data: r } = await supabase.from("sf_reports").select("*");
    const reps = (r as SfReport[]) || [];
    setReports(reps);
    const results: Record<string, { label: string; value: number }[]> = {};
    for (const w of (d as SfDashboard).widgets || []) {
      const rep = reps.find((x) => x.id === w.report_id);
      if (rep) results[w.id] = (await runReport(rep)).chartData;
    }
    setData(results);
  }
  useEffect(() => { load(); }, [id]);

  async function saveWidgets(widgets: DashboardWidget[]) {
    await supabase.from("sf_dashboards").update({ widgets }).eq("id", id);
    await load();
  }
  async function addWidget(reportId: string, size: "half" | "full") {
    const rep = reports.find((r) => r.id === reportId);
    const w: DashboardWidget = { id: crypto.randomUUID(), report_id: reportId, title: rep?.name || "Widget", size };
    await saveWidgets([...(dash?.widgets || []), w]);
    setAdd(false);
    toast("Widget added", "success");
  }
  async function removeWidget(wid: string) {
    await saveWidgets((dash?.widgets || []).filter((w) => w.id !== wid));
  }
  async function rename(name: string) {
    await supabase.from("sf_dashboards").update({ name }).eq("id", id);
  }

  if (!dash) return <div className="center-screen" style={{ minHeight: "50vh" }}><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="record-header">
        <button className="btn-icon" onClick={() => router.push("/dashboards")}><Icon name="ArrowLeft" /></button>
        <span className="record-icon" style={{ background: "#16a5a5" }}><Icon name="Layout" size={20} /></span>
        <div><div className="eyebrow">Dashboard</div>
          <input defaultValue={dash.name} onBlur={(e) => rename(e.target.value)} style={{ fontWeight: 700, fontSize: "1.05rem", width: 320 }} />
        </div>
        <div className="header-actions">
          <button className={`btn ${edit ? "btn-brand" : ""}`} onClick={() => setEdit((e) => !e)}><Icon name="Pencil" size={14} /> {edit ? "Done" : "Edit"}</button>
          <button className="btn btn-brand" onClick={() => setAdd(true)}><Icon name="Plus" size={14} /> Add Widget</button>
        </div>
      </div>

      {(!dash.widgets || dash.widgets.length === 0) ? (
        <div className="empty-state">No widgets yet. Click “Add Widget” to chart a saved report.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          {dash.widgets.map((w) => {
            const rep = reports.find((r) => r.id === w.report_id);
            const cd = data[w.id] || [];
            return (
              <div key={w.id} className="card" style={{ gridColumn: w.size === "full" ? "1 / -1" : "auto" }}>
                <div className="card-header"><Icon name="TrendingUp" size={16} /><h3>{w.title}</h3>
                  {edit && <button className="btn-icon btn-sm ml-auto" onClick={() => removeWidget(w.id)}><Icon name="Trash2" size={12} /></button>}
                </div>
                <div className="card-body">
                  {!rep ? <div className="muted">Report deleted</div>
                    : cd.length === 0 ? <div className="empty-state">No data</div>
                    : rep.chart === "donut" ? <DonutChart data={cd} />
                    : <BarChart data={cd} />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {add && (
        <Modal title="Add Widget" onClose={() => setAdd(false)}>
          {reports.length === 0 ? <p className="muted">No saved reports yet. Create a report first.</p> : (
            <div>
              {reports.map((r) => (
                <div key={r.id} className="flex items-center gap mb" style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "0.5rem 0.75rem" }}>
                  <Icon name="TrendingUp" size={14} />
                  <span style={{ flex: 1 }}>{r.name}</span>
                  <button className="btn btn-sm" onClick={() => addWidget(r.id, "half")}>Add (half)</button>
                  <button className="btn btn-sm" onClick={() => addWidget(r.id, "full")}>Add (full)</button>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
