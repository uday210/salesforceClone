"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getObjectByApi, getFields, getListViews } from "@/lib/metadata";
import { listRecords } from "@/lib/records";
import { getObjectAccess } from "@/lib/session";
import { objectColor } from "@/lib/format";
import { Icon } from "@/lib/icons";
import DataTable from "@/components/DataTable";
import KanbanBoard from "@/components/KanbanBoard";
import ListViewEditor, { applyFilters } from "@/components/ListViewEditor";
import type { SfObject, SfField, SfListView, SfRecord } from "@/lib/types";

export default function ListPage() {
  const params = useParams();
  const router = useRouter();
  const api = String(params.object);
  const [object, setObject] = useState<SfObject | null>(null);
  const [fields, setFields] = useState<SfField[]>([]);
  const [views, setViews] = useState<SfListView[]>([]);
  const [activeView, setActiveView] = useState<SfListView | null>(null);
  const [records, setRecords] = useState<SfRecord[]>([]);
  const [mode, setMode] = useState<"table" | "kanban">("table");
  const [canCreate, setCanCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<"new" | "edit" | null>(null);

  async function refreshViews(selectId?: string) {
    if (!object) return;
    const v = await getListViews(object.id);
    setViews(v);
    if (selectId) setActiveView(v.find((x) => x.id === selectId) || activeView);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      const o = await getObjectByApi(api);
      if (!o) { setLoading(false); return; }
      const [f, v, recs, access] = await Promise.all([
        getFields(o.id), getListViews(o.id), listRecords(o.id, { limit: 500 }), getObjectAccess(o.id),
      ]);
      setObject(o);
      setFields(f);
      setViews(v);
      setActiveView(v.find((x) => x.is_default) || v[0] || null);
      setRecords(recs);
      setCanCreate(access.create);
      setLoading(false);
    })();
  }, [api]);

  if (loading) return <div className="center-screen" style={{ minHeight: "60vh" }}><div className="spinner" /></div>;
  if (!object) return <div className="page"><div className="empty-state">Object “{api}” not found.</div></div>;

  const kanbanField = fields.find((f) => f.api_name === "StageName") || fields.find((f) => f.type === "picklist");
  const filteredRecords = applyFilters(records, (activeView?.filters as any) || []);

  return (
    <div className="page">
      <div className="record-header">
        <span className="record-icon" style={{ background: objectColor(object.api_name) }}><Icon name={object.icon} size={20} /></span>
        <div>
          <div className="eyebrow">{object.label}</div>
          <h1>{object.plural_label}</h1>
        </div>
        <div className="header-actions">
          {views.length > 0 && (
            <select
              style={{ width: "auto" }}
              value={activeView?.id || ""}
              onChange={(e) => setActiveView(views.find((v) => v.id === e.target.value) || null)}
            >
              {views.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
          )}
          {activeView && <button className="btn-icon" title="Edit this list view" onClick={() => setEditor("edit")}><Icon name="Pencil" size={15} /></button>}
          <button className="btn-icon" title="New list view" onClick={() => setEditor("new")}><Icon name="Plus" size={15} /></button>
          {kanbanField && (
            <div className="flex">
              <button className={`btn-icon ${mode === "table" ? "" : ""}`} onClick={() => setMode("table")} title="Table" style={mode === "table" ? { borderColor: "var(--sf-blue)", color: "var(--sf-blue)" } : undefined}><Icon name="List" /></button>
              <button className="btn-icon" onClick={() => setMode("kanban")} title="Kanban" style={mode === "kanban" ? { borderColor: "var(--sf-blue)", color: "var(--sf-blue)" } : undefined}><Icon name="Columns" /></button>
            </div>
          )}
          {canCreate && (
            <Link href={`/o/${object.api_name}/new`} className="btn btn-brand"><Icon name="Plus" size={14} /> New</Link>
          )}
        </div>
      </div>

      <div className="flex items-center mb" style={{ justifyContent: "space-between" }}>
        <span className="muted">{filteredRecords.length} item{filteredRecords.length !== 1 ? "s" : ""}{activeView?.filters?.length ? " · filtered" : ""}</span>
      </div>

      {mode === "kanban" && kanbanField ? (
        <KanbanBoard object={object} field={kanbanField} records={filteredRecords} />
      ) : (
        <DataTable object={object} fields={fields} records={filteredRecords} columns={activeView?.columns || []} />
      )}

      {editor && (
        <ListViewEditor
          object={object}
          fields={fields}
          view={editor === "edit" ? activeView : null}
          onClose={() => setEditor(null)}
          onSaved={(id) => { setEditor(null); refreshViews(id); }}
        />
      )}
    </div>
  );
}
