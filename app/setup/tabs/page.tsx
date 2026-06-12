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
  const [lwcs, setLwcs] = useState<{ id: string; name: string }[]>([]);
  const [vfs, setVfs] = useState<{ id: string; name: string }[]>([]);
  const [show, setShow] = useState(false);
  const [label, setLabel] = useState("");
  const [tabType, setTabType] = useState<"object" | "lwc" | "vf">("object");
  const [objectId, setObjectId] = useState("");
  const [targetId, setTargetId] = useState("");
  const toast = useToast();

  async function reload() {
    setTabs(await getTabs());
    setObjects(await getObjects());
    const { data: l } = await supabase.from("sf_lwc_components").select("id,name").order("name");
    const { data: v } = await supabase.from("sf_vf_pages").select("id,name").order("name");
    setLwcs((l as any[]) || []); setVfs((v as any[]) || []);
  }
  useEffect(() => { reload(); }, []);

  async function create() {
    if (tabType === "object") {
      const obj = objects.find((o) => o.id === objectId);
      if (!obj) return;
      await supabase.from("sf_tabs").insert({ label: label || obj.plural_label, type: "object", object_id: objectId, icon: obj.icon });
    } else {
      if (!targetId) return;
      const name = (tabType === "lwc" ? lwcs : vfs).find((x) => x.id === targetId)?.name || "Tab";
      await supabase.from("sf_tabs").insert({ label: label || name, type: tabType, url: targetId, icon: "FileCode" });
    }
    setShow(false); setLabel(""); setObjectId(""); setTargetId("");
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
          <div className="field mb"><label>Tab Type</label>
            <select value={tabType} onChange={(e) => { setTabType(e.target.value as any); setTargetId(""); }}>
              <option value="object">Object</option>
              <option value="lwc">Lightning Component</option>
              <option value="vf">Visualforce Page</option>
            </select>
          </div>
          {tabType === "object" && <div className="field mb"><label>Object</label><select value={objectId} onChange={(e) => setObjectId(e.target.value)}><option value="">--Select--</option>{objects.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></div>}
          {tabType === "lwc" && <div className="field mb"><label>Component</label><select value={targetId} onChange={(e) => setTargetId(e.target.value)}><option value="">--Select--</option>{lwcs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>}
          {tabType === "vf" && <div className="field mb"><label>Page</label><select value={targetId} onChange={(e) => setTargetId(e.target.value)}><option value="">--Select--</option>{vfs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>}
          <div className="field"><label>Tab Label (optional)</label><input value={label} onChange={(e) => setLabel(e.target.value)} /></div>
        </Modal>
      )}
    </div>
  );
}
