"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { PageComponent, SfObject, SfRecord } from "@/lib/types";
import { getObjects, getFields } from "@/lib/metadata";
import { listRecords } from "@/lib/records";
import { BarChart, DonutChart } from "./Charts";
import { Icon } from "@/lib/icons";

export const COMPONENT_TYPES = [
  { type: "highlights", label: "Highlights Panel", icon: "Star" },
  { type: "rich_text", label: "Rich Text", icon: "AlignLeft" },
  { type: "report_chart", label: "Report Chart", icon: "TrendingUp" },
  { type: "list_view", label: "List View", icon: "List" },
  { type: "record_detail", label: "Record Detail", icon: "Eye" },
  { type: "related_list", label: "Related List", icon: "Layers" },
];

export function ComponentRenderer({ comp }: { comp: PageComponent }) {
  switch (comp.type) {
    case "rich_text":
      return (
        <div className="card mb"><div className="card-body" dangerouslySetInnerHTML={{ __html: comp.props.html || "<p>Rich text…</p>" }} /></div>
      );
    case "highlights":
      return (
        <div className="card mb"><div className="card-body">
          <h3>{comp.props.title || "Highlights"}</h3>
          <p className="muted">{comp.props.subtitle || "Key information at a glance."}</p>
        </div></div>
      );
    case "report_chart":
      return <ChartComponent comp={comp} />;
    case "list_view":
      return <ListComponent comp={comp} />;
    case "record_detail":
      return <div className="card mb"><div className="card-header"><Icon name="Eye" size={16} /><h3>Record Detail</h3></div><div className="card-body muted">Shows the record's fields (on record pages).</div></div>;
    case "related_list":
      return <div className="card mb"><div className="card-header"><Icon name="Layers" size={16} /><h3>{comp.props.title || "Related List"}</h3></div><div className="card-body muted">Lists related records (on record pages).</div></div>;
    default:
      return null;
  }
}

function ChartComponent({ comp }: { comp: PageComponent }) {
  const [data, setData] = useState<{ label: string; value: number }[]>([]);
  const [obj, setObj] = useState<SfObject | null>(null);
  useEffect(() => {
    (async () => {
      const objs = await getObjects();
      const o = objs.find((x) => x.id === comp.props.object_id) || objs.find((x) => x.api_name === "Opportunity");
      if (!o) return;
      setObj(o);
      const fields = await getFields(o.id);
      const groupField = fields.find((f) => f.api_name === (comp.props.group_field || "StageName")) || fields.find((f) => f.type === "picklist");
      const recs = await listRecords(o.id, { limit: 500 });
      const agg: Record<string, number> = {};
      recs.forEach((r) => {
        const k = groupField ? r.data[groupField.api_name] || "None" : "All";
        agg[k] = (agg[k] || 0) + (comp.props.measure === "amount" ? Number(r.data.Amount) || 0 : 1);
      });
      setData(Object.entries(agg).map(([label, value]) => ({ label, value: Math.round(value) })));
    })();
  }, [comp]);
  return (
    <div className="card mb">
      <div className="card-header"><Icon name="TrendingUp" size={16} /><h3>{comp.props.title || `${obj?.label || ""} Chart`}</h3></div>
      <div className="card-body">
        {data.length ? (comp.props.chart === "donut" ? <DonutChart data={data} /> : <BarChart data={data} />) : <div className="empty-state">No data</div>}
      </div>
    </div>
  );
}

function ListComponent({ comp }: { comp: PageComponent }) {
  const [recs, setRecs] = useState<SfRecord[]>([]);
  const [obj, setObj] = useState<SfObject | null>(null);
  useEffect(() => {
    (async () => {
      const objs = await getObjects();
      const o = objs.find((x) => x.id === comp.props.object_id) || objs[0];
      if (!o) return;
      setObj(o);
      setRecs(await listRecords(o.id, { limit: comp.props.limit || 10 }));
    })();
  }, [comp]);
  return (
    <div className="card mb">
      <div className="card-header"><Icon name="List" size={16} /><h3>{comp.props.title || obj?.plural_label}</h3></div>
      <div className="card-body" style={{ padding: 0 }}>
        <table className="data-table">
          <tbody>
            {recs.map((r) => (
              <tr key={r.id}><td><Link href={`/o/${obj?.api_name}/${r.id}`}>{r.name}</Link></td><td className="muted">{new Date(r.created_at).toLocaleDateString()}</td></tr>
            ))}
            {!recs.length && <tr><td className="muted">No records</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
