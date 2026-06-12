"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Icon } from "@/lib/icons";
import { apiNameFromLabel } from "@/lib/format";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import type { SfPermissionSet } from "@/lib/types";

export default function PermissionSetsPage() {
  const [sets, setSets] = useState<SfPermissionSet[]>([]);
  const [show, setShow] = useState(false);
  const [label, setLabel] = useState("");
  const [desc, setDesc] = useState("");
  const toast = useToast();

  async function reload() {
    const { data } = await supabase.from("sf_permission_sets").select("*").order("label");
    setSets((data as SfPermissionSet[]) || []);
  }
  useEffect(() => { reload(); }, []);

  async function create() {
    if (!label) return;
    await supabase.from("sf_permission_sets").insert({ name: apiNameFromLabel(label), label, description: desc });
    setShow(false); setLabel(""); setDesc("");
    toast("Permission set created", "success");
    reload();
  }

  return (
    <div>
      <div className="flex items-center mb" style={{ justifyContent: "space-between" }}>
        <div><h1>Permission Sets</h1><p className="muted">{sets.length} permission sets</p></div>
        <button className="btn btn-brand" onClick={() => setShow(true)}><Icon name="Plus" size={14} /> New Permission Set</button>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Label</th><th>API Name</th><th>Description</th></tr></thead>
          <tbody>
            {sets.map((s) => (
              <tr key={s.id}><td><Link href={`/setup/permission-sets/${s.id}`}>{s.label}</Link></td><td className="muted">{s.name}</td><td className="muted">{s.description}</td></tr>
            ))}
            {!sets.length && <tr><td colSpan={3} className="muted">No permission sets yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {show && (
        <Modal title="New Permission Set" onClose={() => setShow(false)} footer={<><button className="btn" onClick={() => setShow(false)}>Cancel</button><button className="btn btn-brand" onClick={create}>Save</button></>}>
          <div className="field mb"><label>Label *</label><input value={label} onChange={(e) => setLabel(e.target.value)} /></div>
          <div className="field"><label>Description</label><input value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
        </Modal>
      )}
    </div>
  );
}
