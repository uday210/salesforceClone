"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Icon } from "@/lib/icons";
import { apiNameFromLabel } from "@/lib/format";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import type { SfCustomSetting } from "@/lib/types";

export default function CustomSettingsPage() {
  const [settings, setSettings] = useState<SfCustomSetting[]>([]);
  const [sel, setSel] = useState<SfCustomSetting | null>(null);
  const [show, setShow] = useState(false);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<"hierarchy" | "list">("hierarchy");
  const [dataText, setDataText] = useState("{}");
  const toast = useToast();

  async function reload() {
    const { data } = await supabase.from("sf_custom_settings").select("*").order("label");
    setSettings((data as SfCustomSetting[]) || []);
  }
  useEffect(() => { reload(); }, []);
  useEffect(() => { if (sel) setDataText(JSON.stringify(sel.data, null, 2)); }, [sel]);

  async function create() {
    if (!label) return;
    await supabase.from("sf_custom_settings").insert({ api_name: `${apiNameFromLabel(label)}__c`, label, type, fields: [], data: {} });
    setShow(false); setLabel("");
    toast("Custom setting created", "success");
    reload();
  }
  async function saveData() {
    if (!sel) return;
    try {
      const parsed = JSON.parse(dataText);
      await supabase.from("sf_custom_settings").update({ data: parsed }).eq("id", sel.id);
      toast("Saved", "success");
      reload();
    } catch {
      toast("Invalid JSON", "error");
    }
  }

  return (
    <div>
      <div className="flex items-center mb" style={{ justifyContent: "space-between" }}>
        <div><h1>Custom Settings</h1><p className="muted">App configuration data · {settings.length}</p></div>
        <button className="btn btn-brand" onClick={() => setShow(true)}><Icon name="Plus" size={14} /> New Custom Setting</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "0.75rem", alignItems: "start" }}>
        <div className="card"><div className="card-body" style={{ padding: "0.5rem" }}>
          {settings.map((s) => (
            <div key={s.id} className="palette-item" style={sel?.id === s.id ? { borderColor: "var(--sf-blue)" } : {}} onClick={() => setSel(s)}>
              <Icon name="SlidersHorizontal" size={13} /> {s.label} <span className="badge">{s.type}</span>
            </div>
          ))}
          {!settings.length && <p className="muted" style={{ padding: "0.5rem" }}>None yet.</p>}
        </div></div>
        {sel ? (
          <div className="card">
            <div className="card-header"><Icon name="SlidersHorizontal" size={16} /><h3>{sel.label} ({sel.api_name})</h3>
              <button className="btn btn-brand btn-sm ml-auto" onClick={saveData}><Icon name="Save" size={12} /> Save</button>
            </div>
            <div className="card-body">
              <label>Values (JSON)</label>
              <textarea className="code-editor" style={{ minHeight: 240 }} value={dataText} onChange={(e) => setDataText(e.target.value)} />
              <p className="muted mt" style={{ fontSize: "0.78rem" }}>Hierarchy settings hold org/profile-level config; list settings hold named records. Stored as JSON for this platform.</p>
            </div>
          </div>
        ) : <div className="card"><div className="empty-state">Select or create a custom setting.</div></div>}
      </div>
      {show && (
        <Modal title="New Custom Setting" onClose={() => setShow(false)} footer={<><button className="btn" onClick={() => setShow(false)}>Cancel</button><button className="btn btn-brand" onClick={create}>Save</button></>}>
          <div className="form-grid">
            <div className="field"><label>Label *</label><input value={label} onChange={(e) => setLabel(e.target.value)} /></div>
            <div className="field"><label>Type</label><select value={type} onChange={(e) => setType(e.target.value as any)}><option value="hierarchy">Hierarchy</option><option value="list">List</option></select></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
