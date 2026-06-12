"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Icon } from "@/lib/icons";
import { apiNameFromLabel } from "@/lib/format";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import type { SfCustomLabel } from "@/lib/types";

export default function LabelsPage() {
  const [labels, setLabels] = useState<SfCustomLabel[]>([]);
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [category, setCategory] = useState("");
  const toast = useToast();

  async function reload() {
    const { data } = await supabase.from("sf_custom_labels").select("*").order("name");
    setLabels((data as SfCustomLabel[]) || []);
  }
  useEffect(() => { reload(); }, []);

  async function create() {
    if (!name || !value) return;
    await supabase.from("sf_custom_labels").insert({ name: apiNameFromLabel(name), value, category });
    setShow(false); setName(""); setValue(""); setCategory("");
    toast("Label created", "success");
    reload();
  }
  async function updateValue(l: SfCustomLabel, v: string) {
    await supabase.from("sf_custom_labels").update({ value: v }).eq("id", l.id);
    setLabels((ls) => ls.map((x) => (x.id === l.id ? { ...x, value: v } : x)));
  }
  async function del(l: SfCustomLabel) {
    await supabase.from("sf_custom_labels").delete().eq("id", l.id);
    reload();
  }

  return (
    <div>
      <div className="flex items-center mb" style={{ justifyContent: "space-between" }}>
        <div><h1>Custom Labels</h1><p className="muted">Reusable text values · {labels.length}</p></div>
        <button className="btn btn-brand" onClick={() => setShow(true)}><Icon name="Plus" size={14} /> New Label</button>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Value</th><th>Category</th><th></th></tr></thead>
          <tbody>
            {labels.map((l) => (
              <tr key={l.id}>
                <td className="muted">{l.name}</td>
                <td><input value={l.value} onChange={(e) => updateValue(l, e.target.value)} /></td>
                <td className="muted">{l.category}</td>
                <td><button className="btn-icon btn-sm" onClick={() => del(l)}><Icon name="Trash2" size={12} /></button></td>
              </tr>
            ))}
            {!labels.length && <tr><td colSpan={4} className="muted">No custom labels yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {show && (
        <Modal title="New Custom Label" onClose={() => setShow(false)} footer={<><button className="btn" onClick={() => setShow(false)}>Cancel</button><button className="btn btn-brand" onClick={create}>Save</button></>}>
          <div className="form-grid">
            <div className="field"><label>Name *</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="field"><label>Category</label><input value={category} onChange={(e) => setCategory(e.target.value)} /></div>
            <div className="field field-full"><label>Value *</label><input value={value} onChange={(e) => setValue(e.target.value)} /></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
