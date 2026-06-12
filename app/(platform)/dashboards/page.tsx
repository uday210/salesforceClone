"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Icon } from "@/lib/icons";
import type { SfDashboard } from "@/lib/types";

export default function DashboardsPage() {
  const [dashboards, setDashboards] = useState<SfDashboard[]>([]);
  const router = useRouter();

  async function reload() {
    const { data } = await supabase.from("sf_dashboards").select("*").order("name");
    setDashboards((data as SfDashboard[]) || []);
  }
  useEffect(() => { reload(); }, []);

  async function create() {
    const { data } = await supabase.from("sf_dashboards").insert({ name: "New Dashboard", widgets: [] }).select().single();
    router.push(`/dashboards/${data.id}`);
  }

  return (
    <div className="page">
      <div className="record-header">
        <span className="record-icon" style={{ background: "#16a5a5" }}><Icon name="Layout" size={20} /></span>
        <div><div className="eyebrow">Analytics</div><h1>Dashboards</h1></div>
        <div className="header-actions">
          <Link href="/reports" className="btn"><Icon name="TrendingUp" size={14} /> Reports</Link>
          <button className="btn btn-brand" onClick={create}><Icon name="Plus" size={14} /> New Dashboard</button>
        </div>
      </div>
      <div className="stat-grid">
        {dashboards.map((d) => (
          <Link key={d.id} href={`/dashboards/${d.id}`} className="card" style={{ display: "block", color: "inherit" }}>
            <div className="card-body">
              <span className="stat-tile-icon" style={{ background: "#16a5a5" }}><Icon name="Layout" size={18} /></span>
              <div style={{ fontWeight: 700 }}>{d.name}</div>
              <div className="muted" style={{ fontSize: "0.78rem" }}>{d.widgets?.length || 0} widgets</div>
            </div>
          </Link>
        ))}
        {!dashboards.length && <div className="empty-state">No dashboards yet.</div>}
      </div>
    </div>
  );
}
