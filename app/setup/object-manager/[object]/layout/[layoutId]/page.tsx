"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getObjectByApi, getObjects, getFields } from "@/lib/metadata";
import { Icon } from "@/lib/icons";
import { useToast } from "@/components/Toast";
import type { SfObject, SfField, SfPageLayout, LayoutSection } from "@/lib/types";

interface RelatedOption { object: SfObject; field: SfField; }

export default function LayoutEditor() {
  const api = String(useParams().object);
  const layoutId = String(useParams().layoutId);
  const toast = useToast();
  const [object, setObject] = useState<SfObject | null>(null);
  const [fields, setFields] = useState<SfField[]>([]);
  const [layout, setLayout] = useState<SfPageLayout | null>(null);
  const [sections, setSections] = useState<LayoutSection[]>([]);
  const [relatedOptions, setRelatedOptions] = useState<RelatedOption[]>([]);
  const [relatedLists, setRelatedLists] = useState<{ object_api: string; field_api: string; columns: string[] }[]>([]);
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    (async () => {
      const o = await getObjectByApi(api);
      if (!o) return;
      setObject(o);
      const f = await getFields(o.id);
      setFields(f);
      const { data } = await supabase.from("sf_page_layouts").select("*").eq("id", layoutId).single();
      const l = data as SfPageLayout;
      setLayout(l);
      setSections(l.sections || []);
      setRelatedLists(l.related_lists || []);
      setName(l.name);
      setIsDefault(l.is_default);
      // related list options: child objects with a lookup to this object
      const allObjs = await getObjects();
      const opts: RelatedOption[] = [];
      for (const child of allObjs) {
        if (child.id === o.id) continue;
        const cf = await getFields(child.id);
        const lk = cf.find((x) => x.type === "lookup" && x.reference_object_id === o.id);
        if (lk) opts.push({ object: child, field: lk });
      }
      setRelatedOptions(opts);
    })();
  }, [api, layoutId]);

  const placed = new Set(sections.flatMap((s) => s.fields.filter(Boolean) as string[]));
  const available = fields.filter((f) => !placed.has(f.api_name));

  function updateSection(i: number, patch: Partial<LayoutSection>) {
    setSections((ss) => ss.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  }
  function addField(si: number, apiName: string) {
    setSections((ss) => ss.map((s, j) => (j === si ? { ...s, fields: [...s.fields, apiName] } : s)));
  }
  function removeField(si: number, fi: number) {
    setSections((ss) => ss.map((s, j) => (j === si ? { ...s, fields: s.fields.filter((_, k) => k !== fi) } : s)));
  }
  function moveField(si: number, fi: number, dir: -1 | 1) {
    setSections((ss) => ss.map((s, j) => {
      if (j !== si) return s;
      const arr = [...s.fields];
      const ni = fi + dir;
      if (ni < 0 || ni >= arr.length) return s;
      [arr[fi], arr[ni]] = [arr[ni], arr[fi]];
      return { ...s, fields: arr };
    }));
  }

  function toggleRelated(opt: RelatedOption) {
    const key = opt.object.api_name;
    setRelatedLists((rl) =>
      rl.find((r) => r.object_api === key)
        ? rl.filter((r) => r.object_api !== key)
        : [...rl, { object_api: key, field_api: opt.field.api_name, columns: ["Name"] }]
    );
  }

  async function save() {
    if (isDefault && object) {
      await supabase.from("sf_page_layouts").update({ is_default: false }).eq("object_id", object.id).neq("id", layoutId);
    }
    await supabase.from("sf_page_layouts").update({ name, sections, related_lists: relatedLists, is_default: isDefault }).eq("id", layoutId);
    toast("Page layout saved", "success");
  }

  if (!object || !layout) return <div className="spinner" />;
  const labelFor = (apiName: string) => fields.find((f) => f.api_name === apiName)?.label || apiName;

  return (
    <div>
      <div className="flex items-center gap mb">
        <button className="btn-icon" onClick={() => history.back()}><Icon name="ArrowLeft" /></button>
        <span className="record-icon" style={{ background: "var(--sf-blue)" }}><Icon name="Columns" size={18} /></span>
        <div><div className="eyebrow muted">Page Layout · {object.label}</div><input value={name} onChange={(e) => setName(e.target.value)} style={{ fontWeight: 700, fontSize: "1rem", width: 320 }} /></div>
        <label className="flex items-center gap-sm ml-auto"><input type="checkbox" style={{ width: "auto" }} checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} /> Default</label>
        <button className="btn btn-brand" onClick={save}><Icon name="Save" size={14} /> Save</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: "0.75rem", alignItems: "start" }}>
        <div>
          {sections.map((sec, si) => (
            <div key={si} className="card mb">
              <div className="card-header">
                <input value={sec.title} onChange={(e) => updateSection(si, { title: e.target.value })} style={{ width: 200, fontWeight: 600 }} />
                <select value={sec.columns} onChange={(e) => updateSection(si, { columns: Number(e.target.value) as 1 | 2 })} style={{ width: 110 }}>
                  <option value={1}>1 column</option><option value={2}>2 columns</option>
                </select>
                <button className="btn-icon btn-sm ml-auto" onClick={() => setSections((ss) => ss.filter((_, j) => j !== si))}><Icon name="Trash2" size={12} /></button>
              </div>
              <div className="card-body">
                <div className="form-grid" style={{ gridTemplateColumns: sec.columns === 1 ? "1fr" : "1fr 1fr" }}>
                  {sec.fields.map((fa, fi) => (
                    <div key={fi} className="flex items-center gap-sm" style={{ border: "1px solid var(--sf-border)", borderRadius: "var(--radius)", padding: "0.35rem 0.5rem", background: "#fafaf9" }}>
                      <Icon name="Type" size={12} />
                      <span style={{ flex: 1, fontSize: "0.82rem" }}>{labelFor(fa as string)}</span>
                      <button className="btn-icon btn-sm" onClick={() => moveField(si, fi, -1)}><Icon name="ChevronRight" size={11} className="" /></button>
                      <button className="btn-icon btn-sm" onClick={() => moveField(si, fi, 1)}><Icon name="ChevronDown" size={11} /></button>
                      <button className="btn-icon btn-sm" onClick={() => removeField(si, fi)}><Icon name="X" size={11} /></button>
                    </div>
                  ))}
                  {!sec.fields.length && <p className="muted" style={{ gridColumn: "1/-1" }}>No fields — add from the right.</p>}
                </div>
              </div>
            </div>
          ))}
          <button className="btn mb" onClick={() => setSections((ss) => [...ss, { title: "New Section", columns: 2, fields: [] }])}><Icon name="Plus" size={14} /> Add Section</button>

          <div className="card">
            <div className="card-header"><Icon name="Layers" size={16} /><h3>Related Lists</h3></div>
            <div className="card-body">
              {relatedOptions.length === 0 && <p className="muted">No child objects reference {object.label}. Create a lookup field on another object to enable related lists.</p>}
              {relatedOptions.map((opt) => (
                <label key={opt.object.id} className="flex items-center gap-sm mb" style={{ cursor: "pointer" }}>
                  <input type="checkbox" style={{ width: "auto" }} checked={!!relatedLists.find((r) => r.object_api === opt.object.api_name)} onChange={() => toggleRelated(opt)} />
                  <Icon name={opt.object.icon} size={14} /> {opt.object.plural_label} <span className="muted">(via {opt.field.label})</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Available fields palette */}
        <div className="card">
          <div className="card-header"><h3>Available Fields</h3></div>
          <div className="card-body" style={{ padding: "0.5rem" }}>
            {available.map((f) => (
              <div key={f.id} className="flex items-center gap-sm mb" style={{ border: "1px solid var(--sf-border)", borderRadius: "var(--radius)", padding: "0.3rem 0.5rem", fontSize: "0.8rem" }}>
                <span style={{ flex: 1 }}>{f.label}</span>
                <select className="btn-sm" style={{ width: "auto", height: 24, padding: "0 0.3rem" }} value="" onChange={(e) => e.target.value && addField(Number(e.target.value), f.api_name)}>
                  <option value="">+ add</option>
                  {sections.map((s, si) => <option key={si} value={si}>{s.title}</option>)}
                </select>
              </div>
            ))}
            {!available.length && <p className="muted" style={{ padding: "0.5rem" }}>All fields placed.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
