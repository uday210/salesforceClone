"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getObjects, getTabs } from "@/lib/metadata";
import { Icon } from "@/lib/icons";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import type { SfTab, SfObject } from "@/lib/types";

export default function TabsPage() {
  const [tabs, setTabs] = useState<SfTab[]>([]);
  const [objects, setObjects] = useState<SfObject[]>([]);
  const [show, setShow] = useState(false);
  const [label, setLabel] = useState("");
  const [objectId, setObjectId] = useState("");
  const toast = useToast();

  async function reload() { setTabs(await getTabs()); setObjects(await getObjects()); }
  useEffect(() => { reload(); }, []);

  async function create() {
    const obj = objects.find((o) => o.id === objectId);
    if (!obj) return;
    await supabase.from("sf_tabs").insert({ label: label || obj.plural_label, type: "object", object_id: objectId, icon: obj.icon });
    setShow(false); setLabel(""); setObjectId("");
    toast("Tab created", "success");
    reload();
  }

  const objById = Object.fromEntries(objects.map((o) => [o.id, o]));

  return (
    <div>
      <div className="flex items-center mb" style={{ justifyContent: "space-between" }}>
        <div><h1>Tabs</h1><p className="muted">{tabs.length} tabs</p></div>
        <button className="btn btn-brand" onClick={() => setShow(true)}><Icon name="Plus" size={14} /> New Tab</button>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Label</th><th>Type</th><th>Object</th></tr></thead>
          <tbody>
            {tabs.map((t) => (
              <tr key={t.id}><td><Icon name={t.icon} size={13} /> {t.label}</td><td>{t.type}</td><td className="muted">{t.object_id ? objById[t.object_id]?.label : "—"}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      {show && (
        <Modal title="New Tab" onClose={() => setShow(false)} footer={<><button className="btn" onClick={() => setShow(false)}>Cancel</button><button className="btn btn-brand" onClick={create}>Save</button></>}>
          <div className="field mb"><label>Object</label><select value={objectId} onChange={(e) => setObjectId(e.target.value)}><option value="">--Select--</option>{objects.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></div>
          <div className="field"><label>Tab Label (optional)</label><input value={label} onChange={(e) => setLabel(e.target.value)} /></div>
        </Modal>
      )}
    </div>
  );
}
