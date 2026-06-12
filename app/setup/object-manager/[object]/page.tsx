"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getObjectByApi, getObjects, getFields, getValidationRules, getRecordTypes } from "@/lib/metadata";
import { fieldTypeIcon, Icon } from "@/lib/icons";
import { apiNameFromLabel } from "@/lib/format";
import { describeCondition } from "@/lib/validation";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import type { SfObject, SfField, SfValidationRule, SfRecordType, FieldType } from "@/lib/types";

const FIELD_TYPES: FieldType[] = ["text", "textarea", "number", "currency", "percent", "checkbox", "date", "datetime", "email", "phone", "url", "picklist", "lookup", "formula"];
const OPS = ["eq", "ne", "lt", "lte", "gt", "gte", "contains", "blank", "notblank", "in"];

export default function ObjectDetailPage() {
  const api = String(useParams().object);
  const toast = useToast();
  const [object, setObject] = useState<SfObject | null>(null);
  const [allObjects, setAllObjects] = useState<SfObject[]>([]);
  const [fields, setFields] = useState<SfField[]>([]);
  const [rules, setRules] = useState<SfValidationRule[]>([]);
  const [recordTypes, setRecordTypes] = useState<SfRecordType[]>([]);
  const [tab, setTab] = useState<"fields" | "rules" | "recordtypes">("fields");
  const [showField, setShowField] = useState(false);
  const [showRule, setShowRule] = useState(false);
  const [showRT, setShowRT] = useState(false);

  async function reload() {
    const o = await getObjectByApi(api);
    if (!o) return;
    setObject(o);
    setAllObjects(await getObjects());
    setFields(await getFields(o.id));
    setRules(await getValidationRules(o.id));
    setRecordTypes(await getRecordTypes(o.id));
  }
  useEffect(() => { reload(); }, [api]);

  if (!object) return <div className="spinner" />;

  return (
    <div>
      <div className="flex items-center gap mb">
        <span className="record-icon" style={{ background: "var(--sf-blue)" }}><Icon name={object.icon} size={18} /></span>
        <div>
          <div className="eyebrow muted">{object.is_custom ? "Custom Object" : "Standard Object"}</div>
          <h1>{object.label}</h1>
        </div>
      </div>

      <div className="nav-bar" style={{ boxShadow: "none", borderRadius: "var(--radius) var(--radius) 0 0" }}>
        <a className={`nav-tab ${tab === "fields" ? "active" : ""}`} onClick={() => setTab("fields")} style={{ cursor: "pointer" }}>Fields & Relationships ({fields.length})</a>
        <a className={`nav-tab ${tab === "rules" ? "active" : ""}`} onClick={() => setTab("rules")} style={{ cursor: "pointer" }}>Validation Rules ({rules.length})</a>
        {object.enable_record_types && <a className={`nav-tab ${tab === "recordtypes" ? "active" : ""}`} onClick={() => setTab("recordtypes")} style={{ cursor: "pointer" }}>Record Types ({recordTypes.length})</a>}
      </div>

      <div className="card" style={{ borderRadius: "0 0 var(--radius) var(--radius)" }}>
        <div className="card-body">
          {tab === "fields" && (
            <>
              <div className="flex mb" style={{ justifyContent: "flex-end" }}>
                <button className="btn btn-brand btn-sm" onClick={() => setShowField(true)}><Icon name="Plus" size={12} /> New Field</button>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Label</th><th>API Name</th><th>Type</th><th>Required</th></tr></thead>
                  <tbody>
                    {fields.map((f) => (
                      <tr key={f.id}>
                        <td><Icon name={fieldTypeIcon(f.type)} size={13} /> {f.label}</td>
                        <td className="muted">{f.api_name}</td>
                        <td>{f.type}{f.type === "lookup" && f.reference_object_id ? ` (${allObjects.find((o) => o.id === f.reference_object_id)?.label})` : ""}</td>
                        <td>{f.required ? "✓" : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === "rules" && (
            <>
              <div className="flex mb" style={{ justifyContent: "flex-end" }}>
                <button className="btn btn-brand btn-sm" onClick={() => setShowRule(true)}><Icon name="Plus" size={12} /> New Rule</button>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Name</th><th>Condition (error when true)</th><th>Message</th><th>Active</th></tr></thead>
                  <tbody>
                    {rules.map((r) => (
                      <tr key={r.id}>
                        <td>{r.name}</td>
                        <td className="muted" style={{ fontFamily: "monospace", fontSize: "0.72rem" }}>{describeCondition(r.condition)}</td>
                        <td>{r.error_message}</td>
                        <td>{r.active ? "✓" : ""}</td>
                      </tr>
                    ))}
                    {!rules.length && <tr><td colSpan={4} className="muted">No validation rules.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === "recordtypes" && (
            <>
              <div className="flex mb" style={{ justifyContent: "flex-end" }}>
                <button className="btn btn-brand btn-sm" onClick={() => setShowRT(true)}><Icon name="Plus" size={12} /> New Record Type</button>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Label</th><th>API Name</th><th>Default</th><th>Active</th></tr></thead>
                  <tbody>
                    {recordTypes.map((rt) => (
                      <tr key={rt.id}><td>{rt.label}</td><td className="muted">{rt.api_name}</td><td>{rt.is_default ? "✓" : ""}</td><td>{rt.active ? "✓" : ""}</td></tr>
                    ))}
                    {!recordTypes.length && <tr><td colSpan={4} className="muted">No record types.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {showField && <NewFieldModal object={object} allObjects={allObjects} order={fields.length + 1} onClose={() => setShowField(false)} onSaved={() => { setShowField(false); reload(); toast("Field created", "success"); }} />}
      {showRule && <NewRuleModal object={object} fields={fields} onClose={() => setShowRule(false)} onSaved={() => { setShowRule(false); reload(); toast("Validation rule created", "success"); }} />}
      {showRT && <NewRecordTypeModal object={object} onClose={() => setShowRT(false)} onSaved={() => { setShowRT(false); reload(); toast("Record type created", "success"); }} />}
    </div>
  );
}

function NewFieldModal({ object, allObjects, order, onClose, onSaved }: { object: SfObject; allObjects: SfObject[]; order: number; onClose: () => void; onSaved: () => void }) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<FieldType>("text");
  const [required, setRequired] = useState(false);
  const [picklist, setPicklist] = useState("");
  const [refObj, setRefObj] = useState("");
  const [formula, setFormula] = useState("");
  const [saving, setSaving] = useState(false);
  const apiName = label ? `${apiNameFromLabel(label)}__c` : "";

  async function save() {
    if (!label) return;
    setSaving(true);
    const picklistValues = type === "picklist"
      ? picklist.split("\n").map((s) => s.trim()).filter(Boolean).map((v) => ({ value: v, label: v }))
      : [];
    const { error } = await supabase.from("sf_fields").insert({
      object_id: object.id, api_name: apiName, label, type, required: type === "formula" ? false : required, is_custom: true, display_order: order,
      picklist_values: picklistValues, reference_object_id: type === "lookup" ? refObj || null : null,
      formula: type === "formula" ? formula : null,
    });
    setSaving(false);
    if (error) { alert(error.message); return; }
    onSaved();
  }

  return (
    <Modal title="New Custom Field" onClose={onClose} footer={
      <>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-brand" onClick={save} disabled={saving || !label}>Save</button>
      </>
    }>
      <div className="form-grid">
        <div className="field"><label>Field Label *</label><input value={label} onChange={(e) => setLabel(e.target.value)} /></div>
        <div className="field"><label>API Name</label><input value={apiName} disabled /></div>
        <div className="field"><label>Data Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as FieldType)}>
            {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="field"><label className="flex items-center gap-sm" style={{ marginTop: 20 }}><input type="checkbox" style={{ width: "auto" }} checked={required} onChange={(e) => setRequired(e.target.checked)} /> Required</label></div>
        {type === "picklist" && (
          <div className="field field-full"><label>Picklist Values (one per line)</label><textarea value={picklist} onChange={(e) => setPicklist(e.target.value)} /></div>
        )}
        {type === "lookup" && (
          <div className="field field-full"><label>Related Object</label>
            <select value={refObj} onChange={(e) => setRefObj(e.target.value)}>
              <option value="">--Select--</option>
              {allObjects.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
        )}
        {type === "formula" && (
          <div className="field field-full">
            <label>Formula</label>
            <textarea value={formula} onChange={(e) => setFormula(e.target.value)} placeholder='e.g. IF(Amount > 100000, "Large", "Standard")  ·  Amount * 0.1  ·  FirstName & " " & LastName' />
            <span className="muted" style={{ fontSize: "0.72rem" }}>Reference fields by API name. Functions: IF, AND, OR, NOT, TEXT, ROUND, MAX, MIN, LEN, UPPER, LOWER, LEFT, RIGHT, CONTAINS, ISBLANK, TODAY. Use &amp; to join text.</span>
          </div>
        )}
      </div>
    </Modal>
  );
}

interface CondRow { field: string; op: string; value: string; }

function NewRuleModal({ object, fields, onClose, onSaved }: { object: SfObject; fields: SfField[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [logic, setLogic] = useState<"and" | "or">("and");
  const [rows, setRows] = useState<CondRow[]>([{ field: fields[0]?.api_name || "", op: "eq", value: "" }]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function buildCond(r: CondRow): any {
    if (["blank", "notblank"].includes(r.op)) return { op: r.op, field: r.field };
    if (r.op === "in") return { op: r.op, field: r.field, value: r.value.split(",").map((s) => s.trim()) };
    return { op: r.op, field: r.field, value: isNaN(Number(r.value)) ? r.value : Number(r.value) };
  }

  async function save() {
    if (!name || !message || !rows.length) return;
    setSaving(true);
    const condition = rows.length === 1 ? buildCond(rows[0]) : { op: logic, args: rows.map(buildCond) };
    const { error } = await supabase.from("sf_validation_rules").insert({
      object_id: object.id, name: apiNameFromLabel(name), condition, error_message: message, error_location: rows[0].field, active: true,
    });
    setSaving(false);
    if (error) { alert(error.message); return; }
    onSaved();
  }

  function update(i: number, patch: Partial<CondRow>) {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  return (
    <Modal title="New Validation Rule" onClose={onClose} wide footer={
      <>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-brand" onClick={save} disabled={saving}>Save</button>
      </>
    }>
      <p className="muted mb">The error fires when the formula evaluates to <strong>true</strong>.</p>
      <div className="form-grid mb">
        <div className="field"><label>Rule Name *</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="field"><label>Combine conditions with</label>
          <select value={logic} onChange={(e) => setLogic(e.target.value as any)} disabled={rows.length < 2}>
            <option value="and">ALL (AND)</option><option value="or">ANY (OR)</option>
          </select>
        </div>
      </div>
      <label>Conditions</label>
      {rows.map((r, i) => (
        <div key={i} className="flex gap-sm mb" style={{ marginTop: 4, alignItems: "center" }}>
          {i > 0 && <span className="badge" style={{ minWidth: 42, justifyContent: "center" }}>{logic.toUpperCase()}</span>}
          <select value={r.field} onChange={(e) => update(i, { field: e.target.value })}>
            {fields.map((f) => <option key={f.id} value={f.api_name}>{f.label}</option>)}
          </select>
          <select value={r.op} onChange={(e) => update(i, { op: e.target.value })} style={{ width: 130 }}>{OPS.map((o) => <option key={o} value={o}>{o}</option>)}</select>
          {!["blank", "notblank"].includes(r.op) && <input placeholder="value" value={r.value} onChange={(e) => update(i, { value: e.target.value })} />}
          <button className="btn-icon btn-sm" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} disabled={rows.length === 1}><Icon name="X" size={12} /></button>
        </div>
      ))}
      <button className="btn btn-sm mt mb" onClick={() => setRows((rs) => [...rs, { field: fields[0]?.api_name || "", op: "eq", value: "" }])}><Icon name="Plus" size={12} /> Add Condition</button>
      <div className="field"><label>Error Message *</label><input value={message} onChange={(e) => setMessage(e.target.value)} /></div>
    </Modal>
  );
}

function NewRecordTypeModal({ object, onClose, onSaved }: { object: SfObject; onClose: () => void; onSaved: () => void }) {
  const [label, setLabel] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!label) return;
    setSaving(true);
    const { error } = await supabase.from("sf_record_types").insert({
      object_id: object.id, api_name: apiNameFromLabel(label), label, is_default: isDefault, active: true,
    });
    setSaving(false);
    if (error) { alert(error.message); return; }
    onSaved();
  }
  return (
    <Modal title="New Record Type" onClose={onClose} footer={
      <>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-brand" onClick={save} disabled={saving}>Save</button>
      </>
    }>
      <div className="form-grid">
        <div className="field field-full"><label>Record Type Label *</label><input value={label} onChange={(e) => setLabel(e.target.value)} /></div>
        <div className="field field-full"><label className="flex items-center gap-sm"><input type="checkbox" style={{ width: "auto" }} checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} /> Default record type</label></div>
      </div>
    </Modal>
  );
}
