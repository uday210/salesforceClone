"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getObjects, getFields } from "@/lib/metadata";
import { Icon } from "@/lib/icons";
import { useToast } from "@/components/Toast";
import type { SfFlow, SfObject, SfField, FlowNode } from "@/lib/types";
// objects loaded for Get Records configuration

const NODE_TYPES: { type: FlowNode["type"]; label: string; icon: string }[] = [
  { type: "decision", label: "Decision", icon: "GitBranch" },
  { type: "get_records", label: "Get Records", icon: "Database" },
  { type: "loop", label: "Loop", icon: "Workflow" },
  { type: "assignment", label: "Assignment", icon: "Pencil" },
  { type: "update", label: "Update Record", icon: "Save" },
  { type: "screen", label: "Screen", icon: "Layout" },
  { type: "action", label: "Action / Log", icon: "Zap" },
  { type: "end", label: "End", icon: "Check" },
];

export default function FlowBuilder() {
  const id = String(useParams().id);
  const toast = useToast();
  const [flow, setFlow] = useState<SfFlow | null>(null);
  const [fields, setFields] = useState<SfField[]>([]);
  const [objects, setObjects] = useState<SfObject[]>([]);
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<{ from: string; to: string; label?: string }[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("sf_flows").select("*").eq("id", id).single();
      const f = data as SfFlow;
      setFlow(f);
      setNodes(f.definition.nodes || []);
      setEdges(f.definition.edges || []);
      setObjects(await getObjects());
      if (f.trigger_object_id) setFields(await getFields(f.trigger_object_id));
    })();
  }, [id]);

  function addNode(type: FlowNode["type"]) {
    const n: FlowNode = { id: crypto.randomUUID(), type, label: NODE_TYPES.find((t) => t.type === type)?.label, props: {}, x: 80 + nodes.length * 30, y: 140 + nodes.length * 20 };
    setNodes((ns) => [...ns, n]);
    setSelId(n.id);
  }

  function onMouseDown(e: React.MouseEvent, n: FlowNode) {
    drag.current = { id: n.id, dx: e.clientX - n.x, dy: e.clientY - n.y };
    setSelId(n.id);
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!drag.current) return;
    const { id: nid, dx, dy } = drag.current;
    setNodes((ns) => ns.map((n) => (n.id === nid ? { ...n, x: e.clientX - dx, y: e.clientY - dy } : n)));
  }
  function onMouseUp() { drag.current = null; }

  function setNodeProps(props: Record<string, any>) {
    if (!selId) return;
    setNodes((ns) => ns.map((n) => (n.id === selId ? { ...n, props } : n)));
  }
  function setNodeLabel(label: string) {
    if (!selId) return;
    setNodes((ns) => ns.map((n) => (n.id === selId ? { ...n, label } : n)));
  }
  function connect(from: string, to: string, label = "next") {
    setEdges((es) => [...es.filter((e) => !(e.from === from && e.label === label)), ...(to ? [{ from, to, label }] : [])]);
  }

  async function save() {
    await supabase.from("sf_flows").update({ definition: { nodes, edges } }).eq("id", id);
    toast("Flow saved", "success");
  }

  if (!flow) return <div className="spinner" />;
  const sel = nodes.find((n) => n.id === selId) || null;

  return (
    <div>
      <div className="flex items-center gap mb">
        <span className="record-icon" style={{ background: flow.active ? "var(--sf-green)" : "var(--sf-blue)" }}><Icon name="Workflow" size={18} /></span>
        <div><div className="eyebrow muted">{flow.type === "record_triggered" ? `Record-Triggered · ${flow.trigger_event}` : flow.type === "screen" ? "Screen Flow" : flow.type === "scheduled" ? "Scheduled Flow" : "Autolaunched Flow"}</div><h1>{flow.label}</h1></div>
        {(flow.type === "screen" || flow.type === "autolaunched") && (
          <a href={`/flow/${id}/run`} target="_blank" className="btn ml-auto"><Icon name="Play" size={14} /> Run</a>
        )}
        <button className={`btn btn-brand ${flow.type === "record_triggered" || flow.type === "scheduled" ? "ml-auto" : ""}`} onClick={save}><Icon name="Save" size={14} /> Save</button>
      </div>

      <div className="flex gap mb" style={{ flexWrap: "wrap" }}>
        {NODE_TYPES.map((t) => (
          <button key={t.type} className="btn btn-sm" onClick={() => addNode(t.type)}><Icon name={t.icon} size={13} /> {t.label}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "0.75rem", alignItems: "start" }}>
        <div className="flow-canvas" onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
            {edges.map((e, i) => {
              const a = nodes.find((n) => n.id === e.from);
              const b = nodes.find((n) => n.id === e.to);
              if (!a || !b) return null;
              return (
                <g key={i}>
                  <line x1={a.x + 80} y1={a.y + 50} x2={b.x + 80} y2={b.y} stroke="#0176d3" strokeWidth={2} markerEnd="url(#arrow)" />
                  {e.label && e.label !== "next" && <text x={(a.x + b.x) / 2 + 80} y={(a.y + b.y) / 2 + 30} fontSize="10" fill="#5c5c5c">{e.label}</text>}
                </g>
              );
            })}
            <defs>
              <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#0176d3" /></marker>
            </defs>
          </svg>
          {nodes.map((n) => (
            <div
              key={n.id}
              className={`flow-node ${n.type} ${selId === n.id ? "selected" : ""}`}
              style={{ left: n.x, top: n.y }}
              onMouseDown={(e) => onMouseDown(e, n)}
            >
              <div className="node-head">
                <Icon name={NODE_TYPES.find((t) => t.type === n.type)?.icon || (n.type === "start" ? "Play" : "Box")} size={13} />
                {n.label || n.type}
              </div>
              {n.type === "decision" && n.props.field && <div className="muted" style={{ fontSize: "0.68rem" }}>{n.props.field} {n.props.op} {n.props.value}</div>}
              {(n.type === "assignment" || n.type === "update") && (n.props.assignments || []).length > 0 && (
                <div className="muted" style={{ fontSize: "0.68rem" }}>{n.props.assignments.map((a: any) => a.field).join(", ")}</div>
              )}
            </div>
          ))}
        </div>

        {/* Properties */}
        <div className="card">
          <div className="card-header"><h3>Element</h3></div>
          <div className="card-body">
            {!sel ? <p className="muted">Select an element to configure it.</p> : (
              <NodeProps node={sel} nodes={nodes} fields={fields} objects={objects} edges={edges} onChange={setNodeProps} onLabelChange={setNodeLabel} onConnect={connect} />
            )}
          </div>
        </div>
      </div>
      <p className="muted mt" style={{ fontSize: "0.78rem" }}>Drag nodes to reposition. Use the connect fields to link elements. Active flows run on “{flow.trigger_event}” of the trigger object.</p>
    </div>
  );
}

function NodeProps({ node, nodes, fields, objects, edges, onChange, onLabelChange, onConnect }: {
  node: FlowNode; nodes: FlowNode[]; fields: SfField[]; objects: SfObject[];
  edges: { from: string; to: string; label?: string }[];
  onChange: (p: Record<string, any>) => void;
  onLabelChange: (label: string) => void;
  onConnect: (from: string, to: string, label?: string) => void;
}) {
  const others = nodes.filter((n) => n.id !== node.id);
  const p = node.props;
  const set = (k: string, v: any) => onChange({ ...p, [k]: v });
  const edgeTo = (label: string) => edges.find((e) => e.from === node.id && e.label === label)?.to || "";

  return (
    <div>
      <div className="field mb"><label>Label</label><input value={node.label || ""} onChange={(e) => onLabelChange(e.target.value)} placeholder={node.type} /></div>

      {node.type === "get_records" && (
        <>
          <div className="field mb"><label>Object</label>
            <select value={p.object_id || ""} onChange={(e) => set("object_id", e.target.value)}>
              <option value="">--Select--</option>{objects.map((o) => <option key={o.id} value={o.id}>{o.plural_label}</option>)}
            </select>
          </div>
          <div className="field mb"><label>Filter Field (optional)</label><input value={p.filterField || ""} onChange={(e) => set("filterField", e.target.value)} placeholder="e.g. StageName" /></div>
          <div className="field mb"><label>Filter Equals</label><input value={p.filterValue || ""} onChange={(e) => set("filterValue", e.target.value)} /></div>
          <div className="field mb"><label>Store Results As</label><input value={p.store_as || ""} onChange={(e) => set("store_as", e.target.value)} placeholder="e.g. openOpps" /></div>
          <div className="field"><label>Next → go to</label><select value={edgeTo("next")} onChange={(e) => onConnect(node.id, e.target.value, "next")}><option value="">--</option>{others.map((n) => <option key={n.id} value={n.id}>{n.label || n.type}</option>)}</select></div>
        </>
      )}

      {node.type === "loop" && (
        <>
          <div className="field mb"><label>Collection (from Get Records)</label><input value={p.collection || ""} onChange={(e) => set("collection", e.target.value)} placeholder="e.g. openOpps" /></div>
          <AssignmentEditor fields={fields} value={p.assignments || []} onChange={(a) => set("assignments", a)} />
          <div className="field mt"><label>After Loop → go to</label><select value={edgeTo("next")} onChange={(e) => onConnect(node.id, e.target.value, "next")}><option value="">--</option>{others.map((n) => <option key={n.id} value={n.id}>{n.label || n.type}</option>)}</select></div>
        </>
      )}

      {node.type === "screen" && (
        <>
          <div className="field mb"><label>Headline</label><input value={p.headline || ""} onChange={(e) => set("headline", e.target.value)} placeholder="Screen title" /></div>
          <ScreenFieldsEditor value={p.fields || []} onChange={(f) => set("fields", f)} />
          <div className="field mt"><label>Next → go to</label><select value={edgeTo("next")} onChange={(e) => onConnect(node.id, e.target.value, "next")}><option value="">--</option>{others.map((n) => <option key={n.id} value={n.id}>{n.label || n.type}</option>)}</select></div>
        </>
      )}

      {node.type === "decision" && (
        <>
          <div className="field mb"><label>Field</label><select value={p.field || ""} onChange={(e) => set("field", e.target.value)}><option value="">--</option>{fields.map((f) => <option key={f.id} value={f.api_name}>{f.label}</option>)}</select></div>
          <div className="field mb"><label>Operator</label><select value={p.op || "eq"} onChange={(e) => set("op", e.target.value)}>{["eq", "ne", "gt", "lt", "contains", "blank", "notblank"].map((o) => <option key={o}>{o}</option>)}</select></div>
          {!["blank", "notblank"].includes(p.op) && <div className="field mb"><label>Value</label><input value={p.value || ""} onChange={(e) => set("value", e.target.value)} /></div>}
          <div className="field mb"><label>If TRUE → go to</label><select value={edgeTo("true")} onChange={(e) => { onConnect(node.id, e.target.value, "true"); set("branches", { ...(p.branches || {}), true: buildCond(p) }); }}><option value="">--</option>{others.map((n) => <option key={n.id} value={n.id}>{n.label || n.type}</option>)}</select></div>
          <div className="field"><label>Default → go to</label><select value={edgeTo("default")} onChange={(e) => onConnect(node.id, e.target.value, "default")}><option value="">--</option>{others.map((n) => <option key={n.id} value={n.id}>{n.label || n.type}</option>)}</select></div>
        </>
      )}

      {(node.type === "assignment" || node.type === "update") && (
        <>
          <AssignmentEditor fields={fields} value={p.assignments || []} onChange={(a) => set("assignments", a)} />
          <div className="field mt"><label>Next → go to</label><select value={edgeTo("next")} onChange={(e) => onConnect(node.id, e.target.value, "next")}><option value="">--</option>{others.map((n) => <option key={n.id} value={n.id}>{n.label || n.type}</option>)}</select></div>
        </>
      )}

      {node.type === "action" && (
        <>
          <div className="field mb"><label>Log Message</label><input value={p.message || ""} onChange={(e) => set("message", e.target.value)} /></div>
          <div className="field"><label>Next → go to</label><select value={edgeTo("next")} onChange={(e) => onConnect(node.id, e.target.value, "next")}><option value="">--</option>{others.map((n) => <option key={n.id} value={n.id}>{n.label || n.type}</option>)}</select></div>
        </>
      )}

      {(node.type === "start") && (
        <div className="field"><label>Start → go to</label><select value={edgeTo("next")} onChange={(e) => onConnect(node.id, e.target.value, "next")}><option value="">--</option>{others.map((n) => <option key={n.id} value={n.id}>{n.label || n.type}</option>)}</select></div>
      )}
    </div>
  );
}

function buildCond(p: Record<string, any>) {
  if (["blank", "notblank"].includes(p.op)) return { op: p.op, field: p.field };
  return { op: p.op || "eq", field: p.field, value: isNaN(Number(p.value)) ? p.value : Number(p.value) };
}

function ScreenFieldsEditor({ value, onChange }: { value: { label: string; variable: string; type: string }[]; onChange: (f: any[]) => void }) {
  return (
    <div>
      <label>Screen Input Fields</label>
      {value.map((f, i) => (
        <div key={i} className="flex gap-sm mb" style={{ marginTop: 4, alignItems: "center" }}>
          <input placeholder="Label" value={f.label} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
          <input placeholder="variable" value={f.variable} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, variable: e.target.value } : x)))} />
          <select value={f.type} style={{ width: 110 }} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)))}>
            {["text", "number", "checkbox", "date"].map((t) => <option key={t}>{t}</option>)}
          </select>
          <button className="btn-icon btn-sm" onClick={() => onChange(value.filter((_, j) => j !== i))}><Icon name="X" size={12} /></button>
        </div>
      ))}
      <button className="btn btn-sm mt" onClick={() => onChange([...value, { label: "", variable: "", type: "text" }])}><Icon name="Plus" size={12} /> Add Field</button>
    </div>
  );
}

function AssignmentEditor({ fields, value, onChange }: { fields: SfField[]; value: { field: string; value: any }[]; onChange: (a: any[]) => void }) {
  return (
    <div>
      <label>Set Field Values</label>
      {value.map((a, i) => (
        <div key={i} className="flex gap-sm mb" style={{ marginTop: 4 }}>
          <select value={a.field} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, field: e.target.value } : x)))}>
            <option value="">--field--</option>{fields.map((f) => <option key={f.id} value={f.api_name}>{f.label}</option>)}
          </select>
          <input placeholder="value" value={a.value} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
          <button className="btn-icon btn-sm" onClick={() => onChange(value.filter((_, j) => j !== i))}><Icon name="X" size={12} /></button>
        </div>
      ))}
      <button className="btn btn-sm mt" onClick={() => onChange([...value, { field: "", value: "" }])}><Icon name="Plus" size={12} /> Add</button>
    </div>
  );
}
