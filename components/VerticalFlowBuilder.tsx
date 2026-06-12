"use client";
import { useState } from "react";
import { Icon } from "@/lib/icons";
import type { FlowNode, SfObject } from "@/lib/types";

const ELEMENT_TYPES = [
  { type: "screen", label: "Screen", icon: "Layout", desc: "Show a screen and collect input" },
  { type: "assignment", label: "Assignment", icon: "Pencil", desc: "Set a variable's value" },
  { type: "create", label: "Create Records", icon: "Database", desc: "Create a record" },
  { type: "action", label: "Action", icon: "Zap", desc: "Log a message" },
];
const COMPONENT_TYPES = [
  { type: "display", label: "Display Text", icon: "AlignLeft" },
  { type: "text", label: "Text Input", icon: "Type" },
  { type: "number", label: "Number", icon: "Hash" },
  { type: "checkbox", label: "Checkbox", icon: "ToggleLeft" },
  { type: "date", label: "Date", icon: "Calendar" },
];

interface Props {
  start: FlowNode;
  initialElements: FlowNode[];
  objects: SfObject[];
  onChange: (nodes: FlowNode[], edges: { from: string; to: string; label?: string }[]) => void;
}

export default function VerticalFlowBuilder({ start, initialElements, objects, onChange }: Props) {
  const [elements, setElements] = useState<FlowNode[]>(initialElements);
  const [selected, setSelected] = useState<string | null>(null);
  const [menuAt, setMenuAt] = useState<number | null>(null);

  function serialize(els: FlowNode[]) {
    const nodes = [start, ...els];
    const chain = [start, ...els];
    const edges = chain.slice(0, -1).map((n, i) => ({ from: n.id, to: chain[i + 1].id, label: "next" }));
    onChange(nodes, edges);
  }
  function commit(els: FlowNode[]) { setElements(els); serialize(els); }

  function addAt(index: number, type: string) {
    const node: FlowNode = {
      id: crypto.randomUUID(), type: type as any,
      label: ELEMENT_TYPES.find((e) => e.type === type)?.label || type,
      props: type === "screen" ? { headline: "New Screen", components: [] } : {},
      x: 0, y: 0,
    };
    const els = [...elements];
    els.splice(index, 0, node);
    commit(els);
    setMenuAt(null);
    setSelected(node.id);
  }
  function remove(id: string) { commit(elements.filter((e) => e.id !== id)); if (selected === id) setSelected(null); }
  function update(id: string, props: Record<string, any>) { commit(elements.map((e) => (e.id === id ? { ...e, props } : e))); }
  function rename(id: string, label: string) { commit(elements.map((e) => (e.id === id ? { ...e, label } : e))); }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <NodeCard icon="Play" title="Start" subtitle="Flow begins" color="var(--green)" />
      <PlusConnector open={menuAt === 0} onToggle={() => setMenuAt(menuAt === 0 ? null : 0)} onAdd={(t) => addAt(0, t)} />

      {elements.map((el, i) => (
        <div key={el.id}>
          <div onClick={() => setSelected(selected === el.id ? null : el.id)} style={{ cursor: "pointer" }}>
            <NodeCard
              icon={ELEMENT_TYPES.find((e) => e.type === el.type)?.icon || "Box"}
              title={el.label || el.type}
              subtitle={summary(el)}
              color="var(--brand)"
              selected={selected === el.id}
              onDelete={() => remove(el.id)}
            />
          </div>
          {selected === el.id && (
            <div className="card" style={{ margin: "0 0 0 1rem", borderLeft: "3px solid var(--brand)" }}>
              <div className="card-body">
                <ElementEditor el={el} objects={objects} onRename={(l) => rename(el.id, l)} onChange={(p) => update(el.id, p)} />
              </div>
            </div>
          )}
          <PlusConnector open={menuAt === i + 1} onToggle={() => setMenuAt(menuAt === i + 1 ? null : i + 1)} onAdd={(t) => addAt(i + 1, t)} />
        </div>
      ))}

      <NodeCard icon="Check" title="End" subtitle="Flow finishes" color="#747474" />
    </div>
  );
}

function summary(el: FlowNode): string {
  if (el.type === "screen") return `${(el.props.components || []).length} component(s)`;
  if (el.type === "assignment") return (el.props.assignments || []).map((a: any) => a.field).join(", ") || "no assignments";
  if (el.type === "create") return el.props.object_id ? "creates a record" : "pick an object";
  if (el.type === "action") return el.props.message || "log a message";
  return "";
}

function NodeCard({ icon, title, subtitle, color, selected, onDelete }: { icon: string; title: string; subtitle?: string; color: string; selected?: boolean; onDelete?: () => void }) {
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.6rem 0.85rem", boxShadow: selected ? "0 0 0 2px var(--brand)" : undefined }}>
      <span className="record-icon" style={{ background: color, width: 34, height: 34, borderRadius: 8 }}><Icon name={icon} size={16} /></span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{title}</div>
        {subtitle && <div className="muted" style={{ fontSize: "0.74rem" }}>{subtitle}</div>}
      </div>
      {onDelete && <button className="btn-icon btn-sm" onClick={(e) => { e.stopPropagation(); onDelete(); }}><Icon name="Trash2" size={12} /></button>}
    </div>
  );
}

function PlusConnector({ open, onToggle, onAdd }: { open: boolean; onToggle: () => void; onAdd: (type: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
      <div style={{ width: 2, height: 14, background: "var(--border-strong)" }} />
      <button className="btn-icon" onClick={onToggle} style={{ borderRadius: "50%", border: "1px solid var(--brand)", color: "var(--brand)", background: "#fff", width: 26, height: 26 }}>
        <Icon name={open ? "X" : "Plus"} size={14} />
      </button>
      <div style={{ width: 2, height: 14, background: "var(--border-strong)" }} />
      {open && (
        <div className="card" style={{ position: "absolute", top: 30, zIndex: 20, width: 260, boxShadow: "var(--shadow-pop)" }}>
          <div className="card-body" style={{ padding: "0.4rem" }}>
            {ELEMENT_TYPES.map((e) => (
              <div key={e.type} className="palette-item" style={{ marginBottom: 2 }} onClick={() => onAdd(e.type)}>
                <Icon name={e.icon} size={14} />
                <span><div style={{ fontWeight: 600 }}>{e.label}</div><div className="muted" style={{ fontSize: "0.72rem" }}>{e.desc}</div></span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ElementEditor({ el, objects, onRename, onChange }: { el: FlowNode; objects: SfObject[]; onRename: (l: string) => void; onChange: (p: Record<string, any>) => void }) {
  const p = el.props;
  const set = (k: string, v: any) => onChange({ ...p, [k]: v });

  return (
    <div>
      <div className="field mb"><label>Label</label><input value={el.label || ""} onChange={(e) => onRename(e.target.value)} /></div>

      {el.type === "screen" && (
        <>
          <div className="field mb"><label>Screen Headline</label><input value={p.headline || ""} onChange={(e) => set("headline", e.target.value)} /></div>
          <ScreenComponents value={p.components || []} onChange={(c) => set("components", c)} />
        </>
      )}

      {el.type === "assignment" && (
        <AssignRows value={p.assignments || []} onChange={(a) => set("assignments", a)} />
      )}

      {el.type === "create" && (
        <div className="field"><label>Object</label>
          <select value={p.object_id || ""} onChange={(e) => set("object_id", e.target.value)}>
            <option value="">--Select--</option>{objects.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
          <span className="muted" style={{ fontSize: "0.72rem" }}>Creates a record using the variables collected by earlier screens (variable name = field API name).</span>
        </div>
      )}

      {el.type === "action" && (
        <div className="field"><label>Log Message</label><input value={p.message || ""} onChange={(e) => set("message", e.target.value)} /></div>
      )}
    </div>
  );
}

function ScreenComponents({ value, onChange }: { value: any[]; onChange: (c: any[]) => void }) {
  const [menu, setMenu] = useState(false);
  return (
    <div>
      <label>Screen Components</label>
      {value.map((c, i) => (
        <div key={i} className="card mb" style={{ background: "#fafaf9" }}>
          <div className="card-body" style={{ padding: "0.5rem 0.75rem" }}>
            <div className="flex items-center gap-sm mb">
              <Icon name={COMPONENT_TYPES.find((t) => t.type === c.type)?.icon || "Box"} size={13} />
              <strong style={{ fontSize: "0.8rem", flex: 1 }}>{COMPONENT_TYPES.find((t) => t.type === c.type)?.label}</strong>
              <button className="btn-icon btn-sm" onClick={() => onChange(value.filter((_, j) => j !== i))}><Icon name="X" size={12} /></button>
            </div>
            {c.type === "display" ? (
              <input placeholder="Text to display" value={c.text || ""} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
            ) : (
              <div className="grid-2">
                <input placeholder="Label" value={c.label || ""} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                <input placeholder="Variable (API name)" value={c.variable || ""} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, variable: e.target.value } : x)))} />
              </div>
            )}
          </div>
        </div>
      ))}
      <div style={{ position: "relative" }}>
        <button className="btn btn-sm" onClick={() => setMenu(!menu)}><Icon name="Plus" size={12} /> Add Component</button>
        {menu && (
          <div className="card" style={{ position: "absolute", zIndex: 20, width: 200, boxShadow: "var(--shadow-pop)", marginTop: 4 }}>
            <div className="card-body" style={{ padding: "0.3rem" }}>
              {COMPONENT_TYPES.map((t) => (
                <div key={t.type} className="palette-item" style={{ marginBottom: 2 }} onClick={() => { onChange([...value, t.type === "display" ? { type: "display", text: "" } : { type: t.type, label: "", variable: "" }]); setMenu(false); }}>
                  <Icon name={t.icon} size={13} /> {t.label}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AssignRows({ value, onChange }: { value: any[]; onChange: (a: any[]) => void }) {
  return (
    <div>
      <label>Set Variables</label>
      {value.map((a, i) => (
        <div key={i} className="flex gap-sm mb" style={{ marginTop: 4 }}>
          <input placeholder="variable" value={a.field || ""} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, field: e.target.value } : x)))} />
          <input placeholder="value" value={a.value || ""} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
          <button className="btn-icon btn-sm" onClick={() => onChange(value.filter((_, j) => j !== i))}><Icon name="X" size={12} /></button>
        </div>
      ))}
      <button className="btn btn-sm mt" onClick={() => onChange([...value, { field: "", value: "" }])}><Icon name="Plus" size={12} /> Add</button>
    </div>
  );
}
