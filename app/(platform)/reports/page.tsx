"use client";
import { useEffect, useState } from "react";
import { getObjects, getFields } from "@/lib/metadata";
import { listRecords } from "@/lib/records";
import { Icon } from "@/lib/icons";
import { BarChart, DonutChart } from "@/components/Charts";
import type { SfObject, SfField } from "@/lib/types";

export default function ReportsPage() {
  const [objects, setObjects] = useState<SfObject[]>([]);
  const [objectId, setObjectId] = useState("");
  const [fields, setFields] = useState<SfField[]>([]);
  const [groupField, setGroupField] = useState("");
  const [measure, setMeasure] = useState<"count" | "amount">("count");
  const [chart, setChart] = useState<"bar" | "donut">("bar");
  const [data, setData] = useState<{ label: string; value: number }[]>([]);

  useEffect(() => { getObjects().then((o) => { setObjects(o); const opp = o.find((x) => x.api_name === "Opportunity"); if (opp) setObjectId(opp.id); }); }, []);

  useEffect(() => {
    if (!objectId) return;
    (async () => {
      const f = await getFields(objectId);
      setFields(f);
      const pick = f.find((x) => x.api_name === "StageName") || f.find((x) => x.type === "picklist") || f[0];
      setGroupField((g) => g || pick?.api_name || "");
    })();
  }, [objectId]);

  useEffect(() => {
    if (!objectId || !groupField) return;
    (async () => {
      const recs = await listRecords(objectId, { limit: 1000 });
      const agg: Record<string, number> = {};
      recs.forEach((r) => {
        const k = r.data[groupField] ?? "None";
        agg[k] = (agg[k] || 0) + (measure === "amount" ? Number(r.data.Amount) || 0 : 1);
      });
      setData(Object.entries(agg).map(([label, value]) => ({ label: String(label), value: Math.round(value) })));
    })();
  }, [objectId, groupField, measure]);

  return (
    <div className="page">
      <div className="record-header">
        <span className="record-icon" style={{ background: "var(--sf-blue)" }}><Icon name="TrendingUp" size={20} /></span>
        <div><div className="eyebrow">Reports</div><h1>Report Builder</h1></div>
      </div>
      <div className="card mb">
        <div className="card-body">
          <div className="form-grid">
            <div className="field"><label>Object</label><select value={objectId} onChange={(e) => { setObjectId(e.target.value); setGroupField(""); }}>{objects.map((o) => <option key={o.id} value={o.id}>{o.plural_label}</option>)}</select></div>
            <div className="field"><label>Group By</label><select value={groupField} onChange={(e) => setGroupField(e.target.value)}>{fields.map((f) => <option key={f.id} value={f.api_name}>{f.label}</option>)}</select></div>
            <div className="field"><label>Measure</label><select value={measure} onChange={(e) => setMeasure(e.target.value as any)}><option value="count">Record Count</option><option value="amount">Sum of Amount</option></select></div>
            <div className="field"><label>Chart</label><select value={chart} onChange={(e) => setChart(e.target.value as any)}><option value="bar">Bar</option><option value="donut">Donut</option></select></div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-header"><Icon name="TrendingUp" size={16} /><h3>Result</h3></div>
        <div className="card-body">
          {data.length ? (chart === "donut" ? <DonutChart data={data} size={240} /> : <BarChart data={data} height={300} />) : <div className="empty-state">No data</div>}
        </div>
      </div>
    </div>
  );
}
