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

const FIELD_TYPES: FieldType[] = ["text", "textarea", "number", "currency", "percent", "checkbox", "date", "datetime", "email", "phone", "url", "picklist", "lookup"];
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
  const [saving, setSaving] = useState(false);
  const apiName = label ? `${apiNameFromLabel(label)}__c` : "";

  async function save() {
    if (!label) return;
    setSaving(true);
    const picklistValues = type === "picklist"
      ? picklist.split("\n").map((s) => s.trim()).filter(Boolean).map((v) => ({ value: v, label: v }))
      : [];
    const { error } = await supabase.from("sf_fields").insert({
      object_id: object.id, api_name: apiName, label, type, required, is_custom: true, display_order: order,
      picklist_values: picklistValues, reference_object_id: type === "lookup" ? refObj || null : null,
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
      </div>
    </Modal>
  );
}

function NewRuleModal({ object, fields, onClose, onSaved }: { object: SfObject; fields: SfField[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [field, setField] = useState(fields[0]?.api_name || "");
  const [op, setOp] = useState("eq");
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name || !message) return;
    setSaving(true);
    const needsValue = !["blank", "notblank"].includes(op);
    const condition: any = needsValue
      ? (op === "in" ? { op, field, value: value.split(",").map((s) => s.trim()) } : { op, field, value: isNaN(Number(value)) ? value : Number(value) })
      : { op, field };
    const { error } = await supabase.from("sf_validation_rules").insert({
      object_id: object.id, name: apiNameFromLabel(name), condition, error_message: message, error_location: field, active: true,
    });
    setSaving(false);
    if (error) { alert(error.message); return; }
    onSaved();
  }

  return (
    <Modal title="New Validation Rule" onClose={onClose} footer={
      <>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-brand" onClick={save} disabled={saving}>Save</button>
      </>
    }>
      <p className="muted mb">The error fires when the condition evaluates to <strong>true</strong>.</p>
      <div className="form-grid">
        <div className="field field-full"><label>Rule Name *</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="field"><label>Field</label>
          <select value={field} onChange={(e) => setField(e.target.value)}>
            {fields.map((f) => <option key={f.id} value={f.api_name}>{f.label}</option>)}
          </select>
        </div>
        <div className="field"><label>Operator</label>
          <select value={op} onChange={(e) => setOp(e.target.value)}>{OPS.map((o) => <option key={o} value={o}>{o}</option>)}</select>
        </div>
        {!["blank", "notblank"].includes(op) && (
          <div className="field field-full"><label>Value {op === "in" ? "(comma-separated)" : ""}</label><input value={value} onChange={(e) => setValue(e.target.value)} /></div>
        )}
        <div className="field field-full"><label>Error Message *</label><input value={message} onChange={(e) => setMessage(e.target.value)} /></div>
      </div>
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
