"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getObjects } from "@/lib/metadata";
import { Icon } from "@/lib/icons";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import type { SfLightningPage, SfObject } from "@/lib/types";

export default function PagesPage() {
  const [pages, setPages] = useState<SfLightningPage[]>([]);
  const [objects, setObjects] = useState<SfObject[]>([]);
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"record" | "app" | "home">("app");
  const [objectId, setObjectId] = useState("");
  const toast = useToast();

  async function reload() {
    const { data } = await supabase.from("sf_lightning_pages").select("*").order("name");
    setPages((data as SfLightningPage[]) || []);
    setObjects(await getObjects());
  }
  useEffect(() => { reload(); }, []);

  async function create() {
    if (!name) return;
    const { data } = await supabase.from("sf_lightning_pages").insert({
      name, type, object_id: type === "record" ? objectId || null : null,
      regions: { main: [], sidebar: [] }, active: true,
    }).select().single();
    setShow(false); setName("");
    toast("Page created", "success");
    window.location.href = `/setup/pages/${data.id}`;
  }

  return (
    <div>
      <div className="flex items-center mb" style={{ justifyContent: "space-between" }}>
        <div><h1>Lightning App Builder</h1><p className="muted">{pages.length} pages</p></div>
        <button className="btn btn-brand" onClick={() => setShow(true)}><Icon name="Plus" size={14} /> New Page</button>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Type</th><th>Object</th><th>Active</th></tr></thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.id}>
                <td><Link href={`/setup/pages/${p.id}`}><Icon name="Layers" size={13} /> {p.name}</Link></td>
                <td><span className="badge">{p.type}</span></td>
                <td className="muted">{p.object_id ? objects.find((o) => o.id === p.object_id)?.label : "—"}</td>
                <td>{p.active ? "✓" : ""}</td>
              </tr>
            ))}
            {!pages.length && <tr><td colSpan={4} className="muted">No Lightning pages yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {show && (
        <Modal title="New Lightning Page" onClose={() => setShow(false)} footer={<><button className="btn" onClick={() => setShow(false)}>Cancel</button><button className="btn btn-brand" onClick={create}>Create</button></>}>
          <div className="form-grid">
            <div className="field field-full"><label>Page Name *</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="field"><label>Page Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as any)}>
                <option value="app">App Page</option>
                <option value="home">Home Page</option>
                <option value="record">Record Page</option>
              </select>
            </div>
            {type === "record" && (
              <div className="field"><label>Object</label>
                <select value={objectId} onChange={(e) => setObjectId(e.target.value)}>
                  <option value="">--Select--</option>
                  {objects.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
