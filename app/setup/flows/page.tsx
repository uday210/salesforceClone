"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getObjects } from "@/lib/metadata";
import { Icon } from "@/lib/icons";
import { apiNameFromLabel } from "@/lib/format";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import type { SfFlow, SfObject } from "@/lib/types";

const EVENTS = ["before_create", "after_create", "before_update", "after_update", "after_delete"];

export default function FlowsPage() {
  const [flows, setFlows] = useState<SfFlow[]>([]);
  const [objects, setObjects] = useState<SfObject[]>([]);
  const [show, setShow] = useState(false);
  const [label, setLabel] = useState("");
  const [flowType, setFlowType] = useState("record_triggered");
  const [objectId, setObjectId] = useState("");
  const [event, setEvent] = useState("after_create");
  const toast = useToast();

  async function reload() {
    const { data } = await supabase.from("sf_flows").select("*").order("label");
    setFlows((data as SfFlow[]) || []);
    setObjects(await getObjects());
  }
  useEffect(() => { reload(); }, []);

  async function create() {
    if (!label) return;
    const start = { id: crypto.randomUUID(), type: "start", label: "Start", props: {}, x: 60, y: 60 };
    const { data } = await supabase.from("sf_flows").insert({
      api_name: apiNameFromLabel(label), label, type: flowType,
      trigger_object_id: flowType === "record_triggered" ? (objectId || null) : null,
      trigger_event: event,
      definition: { nodes: [start], edges: [] }, active: false,
    }).select().single();
    setShow(false); setLabel("");
    toast("Flow created", "success");
    window.location.href = `/setup/flows/${data.id}`;
  }

  async function toggleActive(f: SfFlow) {
    await supabase.from("sf_flows").update({ active: !f.active }).eq("id", f.id);
    reload();
  }

  return (
    <div>
      <div className="flex items-center mb" style={{ justifyContent: "space-between" }}>
        <div><h1>Flows</h1><p className="muted">{flows.length} flows</p></div>
        <button className="btn btn-brand" onClick={() => setShow(true)}><Icon name="Plus" size={14} /> New Flow</button>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Label</th><th>Trigger Object</th><th>Event</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {flows.map((f) => (
              <tr key={f.id}>
                <td><Link href={`/setup/flows/${f.id}`}><Icon name="Workflow" size={13} /> {f.label}</Link></td>
                <td className="muted">{objects.find((o) => o.id === f.trigger_object_id)?.label || "—"}</td>
                <td>{f.trigger_event}</td>
                <td>{f.active ? <span className="badge" style={{ color: "var(--sf-green)" }}><span className="badge-dot" /> Active</span> : <span className="badge">Draft</span>}</td>
                <td><button className="btn btn-sm" onClick={() => toggleActive(f)}>{f.active ? "Deactivate" : "Activate"}</button></td>
              </tr>
            ))}
            {!flows.length && <tr><td colSpan={5} className="muted">No flows yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {show && (
        <Modal title="New Flow" onClose={() => setShow(false)} footer={<><button className="btn" onClick={() => setShow(false)}>Cancel</button><button className="btn btn-brand" onClick={create}>Create</button></>}>
          <div className="form-grid">
            <div className="field field-full"><label>Flow Label *</label><input value={label} onChange={(e) => setLabel(e.target.value)} /></div>
            <div className="field field-full"><label>Flow Type</label>
              <select value={flowType} onChange={(e) => setFlowType(e.target.value)}>
                <option value="record_triggered">Record-Triggered Flow</option>
                <option value="screen">Screen Flow</option>
                <option value="autolaunched">Autolaunched Flow (No Trigger)</option>
                <option value="scheduled">Scheduled Flow</option>
              </select>
            </div>
            {flowType === "record_triggered" && <>
              <div className="field"><label>Object</label><select value={objectId} onChange={(e) => setObjectId(e.target.value)}><option value="">--Select--</option>{objects.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></div>
              <div className="field"><label>Trigger</label><select value={event} onChange={(e) => setEvent(e.target.value)}>{EVENTS.map((e) => <option key={e} value={e}>{e}</option>)}</select></div>
            </>}
            {flowType === "screen" && <p className="muted field-full" style={{ fontSize: "0.8rem" }}>Screen flows collect input interactively. Add Screen elements in the builder, then click Run.</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}
