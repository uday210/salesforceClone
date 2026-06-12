"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getObjects, getObjectByApi } from "@/lib/metadata";
import { listRecords } from "@/lib/records";
import { getCurrentUser } from "@/lib/session";
import { objectColor } from "@/lib/format";
import { Icon } from "@/lib/icons";
import { BarChart, DonutChart } from "@/components/Charts";
import type { SfRecord } from "@/lib/types";

export default function HomePage() {
  const [counts, setCounts] = useState<{ api: string; label: string; icon: string; count: number }[]>([]);
  const [pipeline, setPipeline] = useState<{ label: string; value: number }[]>([]);
  const [leadStatus, setLeadStatus] = useState<{ label: string; value: number }[]>([]);
  const [recent, setRecent] = useState<{ rec: SfRecord; objApi: string; objLabel: string }[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const user = await getCurrentUser();
      setName(user?.assignment?.full_name || user?.email?.split("@")[0] || "there");
      const objs = await getObjects();
      const wanted = ["Account", "Contact", "Lead", "Opportunity", "Task"];
      const summary: typeof counts = [];
      const recentItems: typeof recent = [];

      for (const api of wanted) {
        const o = objs.find((x) => x.api_name === api);
        if (!o) continue;
        const recs = await listRecords(o.id, { limit: 100 });
        summary.push({ api: o.api_name, label: o.plural_label, icon: o.icon, count: recs.length });
        recs.slice(0, 3).forEach((r) => recentItems.push({ rec: r, objApi: o.api_name, objLabel: o.label }));
      }
      setCounts(summary);

      // Opportunity pipeline by stage
      const opp = objs.find((x) => x.api_name === "Opportunity");
      if (opp) {
        const recs = await listRecords(opp.id, { limit: 500 });
        const byStage: Record<string, number> = {};
        recs.forEach((r) => {
          const s = r.data.StageName || "None";
          byStage[s] = (byStage[s] || 0) + (Number(r.data.Amount) || 0);
        });
        setPipeline(Object.entries(byStage).map(([label, value]) => ({ label, value: Math.round(value) })));
      }

      // Lead status donut
      const lead = objs.find((x) => x.api_name === "Lead");
      if (lead) {
        const recs = await listRecords(lead.id, { limit: 500 });
        const byStatus: Record<string, number> = {};
        recs.forEach((r) => {
          const s = r.data.Status || "New";
          byStatus[s] = (byStatus[s] || 0) + 1;
        });
        setLeadStatus(Object.entries(byStatus).map(([label, value]) => ({ label, value })));
      }

      recentItems.sort((a, b) => (b.rec.created_at > a.rec.created_at ? 1 : -1));
      setRecent(recentItems.slice(0, 8));
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="center-screen" style={{ minHeight: "60vh" }}><div className="spinner" /></div>;
  }

  return (
    <div className="page">
      <div className="record-header">
        <span className="record-icon" style={{ background: "var(--sf-blue)" }}><Icon name="Home" size={20} /></span>
        <div>
          <div className="eyebrow">Home</div>
          <h1>Welcome back, {name} 👋</h1>
        </div>
      </div>

      <div className="stat-grid mb">
        {counts.map((c) => (
          <Link key={c.api} href={`/o/${c.api}`} className="stat-card" style={{ display: "block", color: "inherit", ["--accent" as any]: objectColor(c.api) }}>
            <span className="stat-tile-icon" style={{ background: objectColor(c.api) }}><Icon name={c.icon} size={20} /></span>
            <div className="label">{c.label}</div>
            <div className="value">{c.count}</div>
          </Link>
        ))}
      </div>

      <div className="grid-2 mb" style={{ alignItems: "start" }}>
        <div className="card">
          <div className="card-header"><Icon name="TrendingUp" size={16} /><h3>Pipeline by Stage ($)</h3></div>
          <div className="card-body">
            {pipeline.length ? <BarChart data={pipeline} /> : <div className="empty-state">No opportunities yet</div>}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><Icon name="UserPlus" size={16} /><h3>Leads by Status</h3></div>
          <div className="card-body">
            {leadStatus.length ? <DonutChart data={leadStatus} /> : <div className="empty-state">No leads yet</div>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><Icon name="Star" size={16} /><h3>Recent Records</h3></div>
        <div className="card-body" style={{ padding: 0 }}>
          {recent.length ? (
            <table className="data-table">
              <thead><tr><th>Name</th><th>Object</th><th>Created</th></tr></thead>
              <tbody>
                {recent.map(({ rec, objApi, objLabel }) => (
                  <tr key={rec.id}>
                    <td><Link href={`/o/${objApi}/${rec.id}`}>{rec.name || "Untitled"}</Link></td>
                    <td>{objLabel}</td>
                    <td className="muted">{new Date(rec.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">No records yet. Head to a tab and create your first record.</div>
          )}
        </div>
      </div>
    </div>
  );
}
