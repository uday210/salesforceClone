"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Icon } from "@/lib/icons";
import { evalCondition } from "@/lib/validation";
import type { SfFlow, FlowNode } from "@/lib/types";

export default function FlowRunner() {
  const id = String(useParams().id);
  const [flow, setFlow] = useState<SfFlow | null>(null);
  const [screen, setScreen] = useState<FlowNode | null>(null);
  const [done, setDone] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [screenValues, setScreenValues] = useState<Record<string, any>>({});
  const vars = useRef<Record<string, any>>({});
  const flowRef = useRef<SfFlow | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("sf_flows").select("*").eq("id", id).single();
      const f = data as SfFlow;
      setFlow(f); flowRef.current = f;
      const start = f.definition.nodes.find((n) => n.type === "start") || f.definition.nodes[0];
      const first = f.definition.edges.find((e) => e.from === start?.id);
      runFrom(first?.to);
    })();
  }, [id]);

  async function runFrom(nodeId: string | undefined) {
    const f = flowRef.current;
    if (!f) return;
    const { nodes, edges } = f.definition;
    let nid = nodeId;
    let guard = 0;
    const msgs: string[] = [];
    while (nid && guard++ < 100) {
      const node = nodes.find((n) => n.id === nid);
      if (!node) break;
      if (node.type === "screen") { setScreen(node); setScreenValues({}); setLog((l) => [...l, ...msgs]); return; }
      if (node.type === "end") { setLog((l) => [...l, ...msgs]); setDone(true); return; }

      if (node.type === "assignment" || node.type === "update") {
        for (const a of node.props.assignments || []) vars.current[a.field || a.variable] = a.value;
        msgs.push(`Assignment: set ${(node.props.assignments || []).map((a: any) => a.field || a.variable).join(", ")}`);
      } else if (node.type === "action") {
        msgs.push(node.props.message || "Action executed");
      } else if (node.type === "create") {
        if (node.props.object_id) {
          const data = { ...vars.current };
          await supabase.from("sf_records").insert({ object_id: node.props.object_id, name: data.Name || data.name || "Flow record", data });
          msgs.push("Created a record");
        }
      } else if (node.type === "decision") {
        const outs = edges.filter((e) => e.from === node.id);
        let chosen = outs.find((e) => { const b = node.props.branches?.[e.label || ""]; return b ? evalCondition(b, vars.current) : false; });
        if (!chosen) chosen = outs.find((e) => e.label === "default") || outs[0];
        nid = chosen?.to;
        continue;
      }
      const out = edges.find((e) => e.from === node.id && e.label === "next") || edges.find((e) => e.from === node.id);
      nid = out?.to;
    }
    setLog((l) => [...l, ...msgs]);
    setDone(true);
  }

  function submitScreen() {
    if (!screen) return;
    Object.assign(vars.current, screenValues);
    const f = flowRef.current!;
    const out = f.definition.edges.find((e) => e.from === screen.id && e.label === "next") || f.definition.edges.find((e) => e.from === screen.id);
    setScreen(null);
    runFrom(out?.to);
  }

  if (!flow) return <div className="center-screen" style={{ minHeight: "50vh" }}><div className="spinner" /></div>;

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <div className="record-header">
        <span className="record-icon" style={{ background: "#5867e8" }}><Icon name="Workflow" size={20} /></span>
        <div><div className="eyebrow">Screen Flow</div><h1>{flow.label}</h1></div>
      </div>

      {screen ? (
        <div className="card">
          <div className="card-header"><h3>{screen.props.headline || screen.label || "Screen"}</h3></div>
          <div className="card-body">
            {(screen.props.fields || []).length === 0 && <p className="muted">This screen has no input fields. Click Next.</p>}
            {(screen.props.fields || []).map((fld: any, i: number) => (
              <div key={i} className="field mb">
                <label>{fld.label || fld.variable}</label>
                {fld.type === "checkbox" ? (
                  <input type="checkbox" style={{ width: "auto" }} checked={!!screenValues[fld.variable]} onChange={(e) => setScreenValues((v) => ({ ...v, [fld.variable]: e.target.checked }))} />
                ) : (
                  <input type={fld.type === "number" ? "number" : fld.type === "date" ? "date" : "text"} value={screenValues[fld.variable] ?? ""} onChange={(e) => setScreenValues((v) => ({ ...v, [fld.variable]: e.target.value }))} />
                )}
              </div>
            ))}
            <div className="flex" style={{ justifyContent: "flex-end" }}>
              <button className="btn btn-brand" onClick={submitScreen}>Next <Icon name="ChevronRight" size={14} className="" /></button>
            </div>
          </div>
        </div>
      ) : done ? (
        <div className="card"><div className="card-body" style={{ textAlign: "center", padding: "2rem" }}>
          <Icon name="Check" size={40} color="var(--green)" />
          <h2 style={{ marginTop: "0.5rem" }}>Flow finished</h2>
          {log.length > 0 && (
            <div className="mt" style={{ textAlign: "left", maxWidth: 400, margin: "1rem auto 0" }}>
              {log.map((l, i) => <div key={i} className="muted" style={{ fontSize: "0.8rem" }}>• {l}</div>)}
            </div>
          )}
          <div className="mt"><a href={`/setup/flows/${id}`} className="btn">Back to Flow</a></div>
        </div></div>
      ) : (
        <div className="center-screen" style={{ minHeight: "30vh" }}><div className="spinner" /></div>
      )}
    </div>
  );
}
