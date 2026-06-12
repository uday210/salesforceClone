"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getObjectByApi, getObjects, getFields, getPageLayouts, getLightningPages } from "@/lib/metadata";
import { getRecord, getChildRecords, deleteRecord } from "@/lib/records";
import { getObjectAccess } from "@/lib/session";
import { objectColor } from "@/lib/format";
import { Icon } from "@/lib/icons";
import { FieldDisplay } from "@/components/Fields";
import { ComponentRenderer, RecordProvider } from "@/components/LightningRenderer";
import { useToast } from "@/components/Toast";
import type { SfObject, SfField, SfRecord, SfPageLayout, SfLightningPage } from "@/lib/types";

interface RelatedDef { object: SfObject; field: SfField; records: SfRecord[]; }

export default function RecordDetailPage() {
  const params = useParams();
  const router = useRouter();
  const api = String(params.object);
  const recordId = String(params.recordId);
  const toast = useToast();

  const [object, setObject] = useState<SfObject | null>(null);
  const [fields, setFields] = useState<SfField[]>([]);
  const [record, setRecord] = useState<SfRecord | null>(null);
  const [layout, setLayout] = useState<SfPageLayout | null>(null);
  const [lightningPage, setLightningPage] = useState<SfLightningPage | null>(null);
  const [related, setRelated] = useState<RelatedDef[]>([]);
  const [access, setAccess] = useState({ read: false, create: false, edit: false, del: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const o = await getObjectByApi(api);
      if (!o) { setLoading(false); return; }
      const [f, rec, layouts, acc, allObjs] = await Promise.all([
        getFields(o.id), getRecord(recordId), getPageLayouts(o.id), getObjectAccess(o.id), getObjects(),
      ]);
      const defLayout = layouts.find((l) => l.is_default) || layouts[0] || null;
      const lpages = await getLightningPages({ type: "record", objectId: o.id });
      setLightningPage(lpages.find((p) => p.is_default && p.active) || null);
      setObject(o);
      setFields(f);
      setRecord(rec);
      setLayout(defLayout);
      setAccess(acc);

      // Related lists: any object with a lookup field pointing at this object.
      // If the layout configures related lists, only show those.
      const allowed = defLayout?.related_lists?.length ? new Set(defLayout.related_lists.map((r) => r.object_api)) : null;
      const rel: RelatedDef[] = [];
      for (const child of allObjs) {
        if (child.id === o.id) continue;
        if (allowed && !allowed.has(child.api_name)) continue;
        const childFields = await getFields(child.id);
        const lookupF = childFields.find((cf) => cf.type === "lookup" && cf.reference_object_id === o.id);
        if (lookupF) {
          const kids = await getChildRecords(child.id, lookupF.api_name, recordId);
          rel.push({ object: child, field: lookupF, records: kids });
        }
      }
      setRelated(rel);
      setLoading(false);
    })();
  }, [api, recordId]);

  async function onDelete() {
    if (!record || !confirm(`Delete this ${object?.label}?`)) return;
    await deleteRecord(record.id);
    toast(`${object?.label} deleted`, "success");
    router.push(`/o/${api}`);
  }

  if (loading) return <div className="center-screen" style={{ minHeight: "60vh" }}><div className="spinner" /></div>;
  if (!object || !record) return <div className="page"><div className="empty-state">Record not found.</div></div>;

  const pathField = fields.find((f) => f.api_name === "StageName") || (object.api_name === "Lead" ? fields.find((f) => f.api_name === "Status") : undefined);
  const currentStage = pathField ? record.data[pathField.api_name] : null;

  const highlightFields = fields
    .filter((f) => ["currency", "picklist", "date", "lookup", "email", "phone"].includes(f.type))
    .slice(0, 4);

  return (
    <div className="page">
      <div className="record-header">
        <button className="btn-icon" onClick={() => router.push(`/o/${api}`)}><Icon name="ArrowLeft" /></button>
        <span className="record-icon" style={{ background: objectColor(object.api_name) }}><Icon name={object.icon} size={20} /></span>
        <div>
          <div className="eyebrow">{object.label}</div>
          <h1>{record.name || "Untitled"}</h1>
        </div>
        <div className="header-actions">
          {access.edit && <Link href={`/o/${api}/${recordId}/edit`} className="btn"><Icon name="Pencil" size={14} /> Edit</Link>}
          {access.del && <button className="btn btn-danger" onClick={onDelete}><Icon name="Trash2" size={14} /> Delete</button>}
        </div>
      </div>

      {pathField && currentStage && (
        <div className="path">
          {pathField.picklist_values.map((p, i) => {
            const currentIdx = pathField.picklist_values.findIndex((x) => x.value === currentStage);
            const cls = i < currentIdx ? "complete" : i === currentIdx ? "current" : "";
            return <div key={p.value} className={`path-step ${cls}`}>{p.label}</div>;
          })}
        </div>
      )}

      {highlightFields.length > 0 && (
        <div className="card mb">
          <div className="card-body highlights">
            {highlightFields.map((f) => (
              <div key={f.id} className="highlight-item">
                <div className="label">{f.label}</div>
                <div className="value"><FieldDisplay field={f} value={record.data[f.api_name]} /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {lightningPage ? (
        <RecordProvider value={{ object, fields, record, related: related.map((r) => ({ object: r.object, records: r.records })) }}>
          <div style={{ display: "grid", gridTemplateColumns: lightningPage.regions.sidebar?.length ? "2fr 1fr" : "1fr", gap: "0.75rem", alignItems: "start" }}>
            <div>{(lightningPage.regions.main || []).map((c) => <ComponentRenderer key={c.id} comp={c} />)}</div>
            {lightningPage.regions.sidebar?.length > 0 && <div>{lightningPage.regions.sidebar.map((c) => <ComponentRenderer key={c.id} comp={c} />)}</div>}
          </div>
        </RecordProvider>
      ) : (
      <div className="record-grid">
        <div>
          <div className="card mb">
            <div className="card-header"><Icon name="List" size={16} /><h3>Details</h3></div>
            <div className="card-body">
              {layout?.sections?.length ? (
                layout.sections.map((sec, si) => (
                  <div key={si} style={{ marginBottom: "1.25rem" }}>
                    <div className="section-title">{sec.title}</div>
                    <div className="form-grid" style={{ gridTemplateColumns: sec.columns === 1 ? "1fr" : "1fr 1fr" }}>
                      {sec.fields.filter(Boolean).map((fa) => {
                        const f = fields.find((x) => x.api_name === fa);
                        if (!f) return null;
                        return (
                          <div key={f.id} className="field">
                            <span className="field-display-label">{f.label}</span>
                            <FieldDisplay field={f} value={record.data[f.api_name]} data={record.data} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="form-grid">
                  {fields.map((f) => (
                    <div key={f.id} className="field">
                      <span className="field-display-label">{f.label}</span>
                      <FieldDisplay field={f} value={record.data[f.api_name]} data={record.data} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {related.map((r) => (
            <div key={r.object.id} className="card mb">
              <div className="card-header">
                <Icon name={r.object.icon} size={16} />
                <h3>{r.object.plural_label} ({r.records.length})</h3>
                <Link href={`/o/${r.object.api_name}/new`} className="btn btn-sm ml-auto"><Icon name="Plus" size={12} /> New</Link>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {r.records.length ? (
                  <table className="data-table">
                    <thead><tr><th>Name</th><th>Created</th></tr></thead>
                    <tbody>
                      {r.records.map((kid) => (
                        <tr key={kid.id}>
                          <td><Link href={`/o/${r.object.api_name}/${kid.id}`}>{kid.name}</Link></td>
                          <td className="muted">{new Date(kid.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty-state" style={{ padding: "1.5rem" }}>No related {r.object.plural_label.toLowerCase()}.</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div>
          <div className="card mb">
            <div className="card-header"><Icon name="Eye" size={16} /><h3>Record Info</h3></div>
            <div className="card-body">
              <div className="field mb"><span className="field-display-label">Created</span><span className="field-display-value">{new Date(record.created_at).toLocaleString()}</span></div>
              <div className="field"><span className="field-display-label">Last Modified</span><span className="field-display-value">{new Date(record.updated_at).toLocaleString()}</span></div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
