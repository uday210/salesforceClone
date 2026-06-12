"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getObjects } from "@/lib/metadata";
import { Icon } from "@/lib/icons";
import { useToast } from "@/components/Toast";
import type { SfApexClass, SfObject } from "@/lib/types";

const TRIGGER_EVENTS = ["before insert", "after insert", "before update", "after update", "after delete"];
const SAMPLE_CLASS = `// A reusable class with STATIC methods. Keep the body a pure class so other
// classes and triggers can call it, e.g. AccountService.rate(acc).
class AccountService {
  static rate(acc) {
    return Number(acc.AnnualRevenue) > 1000000 ? 'Hot' : 'Warm';
  }
  static async topAccounts() {
    return await query("SELECT Name, AnnualRevenue FROM Account ORDER BY AnnualRevenue DESC LIMIT 5");
  }
}`;
const SAMPLE_BATCH = `// Batchable pattern — runs in chunks like Database.executeBatch.
await Database.executeBatch({
  start: () => "SELECT Name, AnnualRevenue FROM Account",
  execute: async (scope) => {
    for (const acc of scope) {
      System.debug('Processing ' + acc.Name);
    }
  },
  finish: () => System.debug('Batch complete'),
}, 50); // scope size`;
const SAMPLE_TRIGGER = `// Trigger body — runs on the configured events.
// Trigger.new / Trigger.old are arrays; Trigger.isInsert / isUpdate / isBefore / isAfter are booleans.
for (const acc of Trigger.new) {
  if (!acc.Rating && acc.AnnualRevenue > 1000000) {
    acc.Rating = 'Hot';
    System.debug('Auto-rated ' + (acc.Name || '') + ' as Hot');
  }
}`;

export default function ApexPage() {
  const [classes, setClasses] = useState<SfApexClass[]>([]);
  const [objects, setObjects] = useState<SfObject[]>([]);
  const [sel, setSel] = useState<SfApexClass | null>(null);
  const [output, setOutput] = useState<string[]>([]);
  const toast = useToast();

  async function reload() {
    const { data } = await supabase.from("sf_apex_classes").select("*").order("name");
    setClasses((data as SfApexClass[]) || []);
    setObjects(await getObjects());
  }
  useEffect(() => { reload(); }, []);

  async function create(type: "class" | "trigger", body?: string) {
    const name = prompt(`New ${type === "trigger" ? "trigger" : "class"} name:`);
    if (!name) return;
    const { data } = await supabase.from("sf_apex_classes").insert({
      name, type, body: body || (type === "class" ? SAMPLE_CLASS : SAMPLE_TRIGGER), trigger_events: [], active: true,
    }).select().single();
    await reload();
    setSel(data as SfApexClass);
  }

  async function save() {
    if (!sel) return;
    await supabase.from("sf_apex_classes").update({
      body: sel.body, trigger_object_id: sel.trigger_object_id, trigger_events: sel.trigger_events, active: sel.active,
    }).eq("id", sel.id);
    toast("Saved", "success");
    reload();
  }

  async function del() {
    if (!sel || !confirm("Delete this class?")) return;
    await supabase.from("sf_apex_classes").delete().eq("id", sel.id);
    setSel(null); reload();
  }

  async function runAnonymous() {
    if (!sel) return;
    setOutput(["Running…"]);
    const { runApex } = await import("@/lib/apexRuntime");
    const res = await runApex(sel.body);
    setOutput(res.logs.length ? res.logs : ["(no output)"]);
  }

  return (
    <div>
      <div className="flex items-center mb" style={{ justifyContent: "space-between" }}>
        <h1>Apex Classes</h1>
        <div className="flex gap">
          <button className="btn" onClick={() => create("class")}><Icon name="Plus" size={14} /> New Class</button>
          <button className="btn" onClick={() => create("trigger")}><Icon name="Plus" size={14} /> New Trigger</button>
          <button className="btn" onClick={() => create("class", SAMPLE_BATCH)}><Icon name="Plus" size={14} /> New Batch</button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "0.75rem", alignItems: "start" }}>
        <div className="card">
          <div className="card-body" style={{ padding: "0.5rem" }}>
            {classes.map((c) => (
              <div key={c.id} className={`palette-item ${sel?.id === c.id ? "selected" : ""}`} style={sel?.id === c.id ? { borderColor: "var(--sf-blue)" } : {}} onClick={() => { setSel(c); setOutput([]); }}>
                <Icon name="Code2" size={13} /> {c.name} <span className="badge" style={{ marginLeft: 4 }}>{c.type}</span>
              </div>
            ))}
            {!classes.length && <p className="muted" style={{ padding: "0.5rem" }}>No classes yet.</p>}
          </div>
        </div>

        {sel ? (
          <div className="card">
            <div className="card-header">
              <Icon name="Code2" size={16} /><h3>{sel.name}.{sel.type === "trigger" ? "trigger" : "cls"}</h3>
              <div className="ml-auto flex gap">
                {sel.type === "class" && <button className="btn btn-sm" onClick={runAnonymous}><Icon name="Play" size={12} /> Run</button>}
                <button className="btn btn-sm btn-danger" onClick={del}><Icon name="Trash2" size={12} /></button>
                <button className="btn btn-brand btn-sm" onClick={save}><Icon name="Save" size={12} /> Save</button>
              </div>
            </div>
            <div className="card-body">
              {sel.type === "trigger" && (
                <div className="form-grid mb">
                  <div className="field"><label>Trigger Object</label>
                    <select value={sel.trigger_object_id || ""} onChange={(e) => setSel({ ...sel, trigger_object_id: e.target.value })}>
                      <option value="">--Select--</option>{objects.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="field"><label>Events</label>
                    <div className="flex gap-sm" style={{ flexWrap: "wrap" }}>
                      {TRIGGER_EVENTS.map((ev) => (
                        <label key={ev} className="badge" style={{ cursor: "pointer" }}>
                          <input type="checkbox" style={{ width: "auto" }} checked={(sel.trigger_events || []).includes(ev)}
                            onChange={() => setSel({ ...sel, trigger_events: (sel.trigger_events || []).includes(ev) ? sel.trigger_events.filter((x) => x !== ev) : [...(sel.trigger_events || []), ev] })} /> {ev}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <textarea className="code-editor" value={sel.body} onChange={(e) => setSel({ ...sel, body: e.target.value })} />
              {output.length > 0 && (
                <div className="mt" style={{ background: "#1e1e2e", color: "#a6e3a1", padding: "0.75rem", borderRadius: "var(--radius)", fontFamily: "monospace", fontSize: "0.78rem" }}>
                  <div className="muted" style={{ color: "#6c7086" }}>Execution Log</div>
                  {output.map((l, i) => <div key={i}>{l}</div>)}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card"><div className="empty-state">Select or create a class to edit.</div></div>
        )}
      </div>
    </div>
  );
}
