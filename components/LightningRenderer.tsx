"use client";
import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import type { PageComponent, SfObject, SfField, SfRecord } from "@/lib/types";
import { getObjects, getFields } from "@/lib/metadata";
import { listRecords } from "@/lib/records";
import { BarChart, DonutChart } from "./Charts";
import { FieldDisplay } from "./Fields";
import { Icon } from "@/lib/icons";

export const COMPONENT_TYPES = [
  { type: "highlights", label: "Highlights Panel", icon: "Star" },
  { type: "record_detail", label: "Record Detail", icon: "Eye" },
  { type: "related_list", label: "Related List", icon: "Layers" },
  { type: "rich_text", label: "Rich Text", icon: "AlignLeft" },
  { type: "report_chart", label: "Report Chart", icon: "TrendingUp" },
  { type: "list_view", label: "List View", icon: "List" },
  { type: "recent_items", label: "Recent Items", icon: "Star" },
  { type: "activity", label: "Activity Timeline", icon: "Calendar" },
  { type: "quick_links", label: "Quick Links", icon: "Link" },
];

// Record context lets record-page components render real record data.
export interface RecordCtx {
  object: SfObject;
  fields: SfField[];
  record: SfRecord;
  related: { object: SfObject; records: SfRecord[] }[];
}
const RecordContext = createContext<RecordCtx | null>(null);
export const RecordProvider = RecordContext.Provider;

export function ComponentRenderer({ comp }: { comp: PageComponent }) {
  const ctx = useContext(RecordContext);
  switch (comp.type) {
    case "rich_text":
      return <div className="card mb"><div className="card-body" dangerouslySetInnerHTML={{ __html: comp.props.html || "<p>Rich text…</p>" }} /></div>;
    case "highlights":
      return <HighlightsComp comp={comp} ctx={ctx} />;
    case "record_detail":
      return <RecordDetailComp comp={comp} ctx={ctx} />;
    case "related_list":
      return <RelatedListComp comp={comp} ctx={ctx} />;
    case "report_chart":
      return <ChartComponent comp={comp} />;
    case "list_view":
      return <ListComponent comp={comp} />;
    case "recent_items":
      return <ListComponent comp={{ ...comp, props: { ...comp.props, title: comp.props.title || "Recent Items", limit: 5 } }} />;
    case "activity":
      return <div className="card mb"><div className="card-header"><Icon name="Calendar" size={16} /><h3>{comp.props.title || "Activity"}</h3></div><div className="card-body muted">Upcoming and past activity for this record.</div></div>;
    case "quick_links":
      return <div className="card mb"><div className="card-header"><Icon name="Link" size={16} /><h3>{comp.props.title || "Quick Links"}</h3></div><div className="card-body"><div dangerouslySetInnerHTML={{ __html: comp.props.html || "Add links in the properties panel." }} /></div></div>;
    default:
      return null;
  }
}

function HighlightsComp({ comp, ctx }: { comp: PageComponent; ctx: RecordCtx | null }) {
  if (ctx) {
    const hi = ctx.fields.filter((f) => ["currency", "picklist", "date", "lookup", "email", "phone"].includes(f.type)).slice(0, 4);
    return (
      <div className="card mb"><div className="card-body highlights">
        {hi.map((f) => (
          <div key={f.id} className="highlight-item">
            <div className="label">{f.label}</div>
            <div className="value"><FieldDisplay field={f} value={ctx.record.data[f.api_name]} data={ctx.record.data} /></div>
          </div>
        ))}
      </div></div>
    );
  }
  return <div className="card mb"><div className="card-body"><h3>{comp.props.title || "Highlights"}</h3><p className="muted">{comp.props.subtitle || "Key information at a glance."}</p></div></div>;
}

function RecordDetailComp({ comp, ctx }: { comp: PageComponent; ctx: RecordCtx | null }) {
  if (!ctx) return <div className="card mb"><div className="card-header"><Icon name="Eye" size={16} /><h3>Record Detail</h3></div><div className="card-body muted">Shows the record's fields (on record pages).</div></div>;
  return (
    <div className="card mb">
      <div className="card-header"><Icon name="List" size={16} /><h3>{comp.props.title || "Details"}</h3></div>
      <div className="card-body"><div className="form-grid">
        {ctx.fields.map((f) => (
          <div key={f.id} className="field"><span className="field-display-label">{f.label}</span><FieldDisplay field={f} value={ctx.record.data[f.api_name]} data={ctx.record.data} /></div>
        ))}
      </div></div>
    </div>
  );
}

function RelatedListComp({ comp, ctx }: { comp: PageComponent; ctx: RecordCtx | null }) {
  if (!ctx) return <div className="card mb"><div className="card-header"><Icon name="Layers" size={16} /><h3>{comp.props.title || "Related List"}</h3></div><div className="card-body muted">Lists related records (on record pages).</div></div>;
  return (
    <>
      {ctx.related.map((r) => (
        <div key={r.object.id} className="card mb">
          <div className="card-header"><Icon name={r.object.icon} size={16} /><h3>{r.object.plural_label} ({r.records.length})</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="data-table"><tbody>
              {r.records.map((kid) => <tr key={kid.id}><td><Link href={`/o/${r.object.api_name}/${kid.id}`}>{kid.name}</Link></td><td className="muted">{new Date(kid.created_at).toLocaleDateString()}</td></tr>)}
              {!r.records.length && <tr><td className="muted">None</td></tr>}
            </tbody></table>
          </div>
        </div>
      ))}
    </>
  );
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
      <div className="card-body">{data.length ? (comp.props.chart === "donut" ? <DonutChart data={data} /> : <BarChart data={data} />) : <div className="empty-state">No data</div>}</div>
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
        <table className="data-table"><tbody>
          {recs.map((r) => <tr key={r.id}><td><Link href={`/o/${obj?.api_name}/${r.id}`}>{r.name}</Link></td><td className="muted">{new Date(r.created_at).toLocaleDateString()}</td></tr>)}
          {!recs.length && <tr><td className="muted">No records</td></tr>}
        </tbody></table>
      </div>
    </div>
  );
}
