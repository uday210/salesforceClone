"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { apiNameFromLabel } from "@/lib/format";
import { Icon } from "@/lib/icons";
import Modal from "./Modal";
import { useToast } from "./Toast";
import type { SfObject, SfField, SfListView } from "@/lib/types";

const OPS = ["equals", "not equal", "contains", "greater", "less", "starts"];

export default function ListViewEditor({
  object, fields, view, onClose, onSaved,
}: {
  object: SfObject;
  fields: SfField[];
  view: SfListView | null; // null = create new
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const toast = useToast();
  const [label, setLabel] = useState(view?.label || "");
  const [columns, setColumns] = useState<string[]>(view?.columns?.length ? view.columns : ["Name"]);
  const [filters, setFilters] = useState<{ field: string; op: string; value: string }[]>(
    (view?.filters as any[]) || []
  );
  const [saving, setSaving] = useState(false);

  function toggleCol(api: string) {
    setColumns((c) => (c.includes(api) ? c.filter((x) => x !== api) : [...c, api]));
  }
  function moveCol(i: number, dir: -1 | 1) {
    setColumns((c) => {
      const arr = [...c]; const j = i + dir;
      if (j < 0 || j >= arr.length) return c;
      [arr[i], arr[j]] = [arr[j], arr[i]]; return arr;
    });
  }

  async function save() {
    if (!label) { toast("Name is required", "error"); return; }
    setSaving(true);
    const payload = {
      object_id: object.id,
      api_name: view?.api_name || apiNameFromLabel(label),
      label, columns, filters, is_default: view?.is_default || false,
    };
    let id = view?.id;
    if (view) {
      await supabase.from("sf_list_views").update({ label, columns, filters }).eq("id", view.id);
    } else {
      const { data, error } = await supabase.from("sf_list_views").insert(payload).select().single();
      if (error) { toast(error.message, "error"); setSaving(false); return; }
      id = data.id;
    }
    setSaving(false);
    toast("List view saved", "success");
    onSaved(id!);
  }

  const selectedCols = columns.map((api) => fields.find((f) => f.api_name === api)).filter(Boolean) as SfField[];
  const availableCols = fields.filter((f) => !columns.includes(f.api_name));

  return (
    <Modal title={view ? "Edit List View" : "New List View"} onClose={onClose} wide footer={
      <>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-brand" onClick={save} disabled={saving}>Save</button>
      </>
    }>
      <div className="field mb"><label>List View Name *</label><input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. My Open Opportunities" /></div>

      <div className="grid-2 mb" style={{ alignItems: "start" }}>
        <div>
          <label>Selected Columns (in order)</label>
          {selectedCols.map((f, i) => (
            <div key={f.id} className="flex items-center gap-sm mb" style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "0.3rem 0.5rem", marginTop: 4 }}>
              <span style={{ flex: 1, fontSize: "0.82rem" }}>{f.label}</span>
              <button className="btn-icon btn-sm" onClick={() => moveCol(i, -1)}><Icon name="ChevronRight" size={11} className="" /></button>
              <button className="btn-icon btn-sm" onClick={() => moveCol(i, 1)}><Icon name="ChevronDown" size={11} /></button>
              <button className="btn-icon btn-sm" onClick={() => toggleCol(f.api_name)}><Icon name="X" size={11} /></button>
            </div>
          ))}
          {!selectedCols.length && <p className="muted">No columns selected.</p>}
        </div>
        <div>
          <label>Available Fields</label>
          <div style={{ maxHeight: 200, overflowY: "auto", marginTop: 4 }}>
            {availableCols.map((f) => (
              <div key={f.id} className="flex items-center gap-sm mb" style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "0.3rem 0.5rem" }}>
                <span style={{ flex: 1, fontSize: "0.82rem" }}>{f.label}</span>
                <button className="btn btn-sm" onClick={() => toggleCol(f.api_name)}><Icon name="Plus" size={11} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <label>Filters (records must match all)</label>
      {filters.map((flt, i) => (
        <div key={i} className="flex gap-sm mb" style={{ marginTop: 4, alignItems: "center" }}>
          <select value={flt.field} onChange={(e) => setFilters((fs) => fs.map((x, j) => j === i ? { ...x, field: e.target.value } : x))}>
            <option value="">--field--</option>
            {fields.map((f) => <option key={f.id} value={f.api_name}>{f.label}</option>)}
          </select>
          <select value={flt.op} style={{ width: 130 }} onChange={(e) => setFilters((fs) => fs.map((x, j) => j === i ? { ...x, op: e.target.value } : x))}>
            {OPS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <input placeholder="value" value={flt.value} onChange={(e) => setFilters((fs) => fs.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} />
          <button className="btn-icon btn-sm" onClick={() => setFilters((fs) => fs.filter((_, j) => j !== i))}><Icon name="X" size={12} /></button>
        </div>
      ))}
      <button className="btn btn-sm mt" onClick={() => setFilters((fs) => [...fs, { field: fields[0]?.api_name || "", op: "equals", value: "" }])}><Icon name="Plus" size={12} /> Add Filter</button>
    </Modal>
  );
}

// Apply list view filters to records (client-side, AND logic)
export function applyFilters(records: any[], filters: { field: string; op: string; value: string }[]): any[] {
  if (!filters?.length) return records;
  return records.filter((r) =>
    filters.every((f) => {
      if (!f.field) return true;
      const v = r.data?.[f.field];
      const val = f.value;
      switch (f.op) {
        case "equals": return String(v ?? "") == val;
        case "not equal": return String(v ?? "") != val;
        case "contains": return String(v ?? "").toLowerCase().includes(val.toLowerCase());
        case "starts": return String(v ?? "").toLowerCase().startsWith(val.toLowerCase());
        case "greater": return Number(v) > Number(val);
        case "less": return Number(v) < Number(val);
        default: return true;
      }
    })
  );
}
