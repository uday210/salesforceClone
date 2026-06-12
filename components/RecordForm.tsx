"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SfObject, SfField, SfValidationRule, SfRecord } from "@/lib/types";
import { FieldInput } from "./Fields";
import { runValidationRules } from "@/lib/validation";
import { coerceFieldValue, createRecord, updateRecord } from "@/lib/records";
import { runAutomation } from "@/lib/flowEngine";
import { useToast } from "./Toast";
import { Icon } from "@/lib/icons";

export default function RecordForm({
  object, fields, rules, record, onClose,
}: {
  object: SfObject;
  fields: SfField[];
  rules: SfValidationRule[];
  record?: SfRecord | null;
  onClose?: () => void;
}) {
  const isEdit = !!record;
  const [data, setData] = useState<Record<string, any>>(record?.data || {});
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const editable = fields.filter((f) => !["formula", "autonumber"].includes(f.type));

  function setField(api: string, v: any) {
    setData((d) => ({ ...d, [api]: v }));
  }

  async function save() {
    // required check
    const missing = editable
      .filter((f) => f.required && (data[f.api_name] === undefined || data[f.api_name] === "" || data[f.api_name] === null))
      .map((f) => `${f.label} is required.`);

    const coerced: Record<string, any> = {};
    for (const f of editable) coerced[f.api_name] = coerceFieldValue(f, data[f.api_name]);

    const vErrors = runValidationRules(rules, coerced).map((e) => e.message);
    const allErrors = [...missing, ...vErrors];
    if (allErrors.length) {
      setErrors(allErrors);
      return;
    }
    setErrors([]);
    setSaving(true);
    try {
      let rec: SfRecord;
      if (isEdit && record) {
        rec = await updateRecord(object.api_name, record.id, coerced);
        await runAutomation(object.id, "after_update", { id: rec.id, data: coerced });
        toast(`${object.label} saved`, "success");
      } else {
        rec = await createRecord(object.api_name, object.id, coerced);
        await runAutomation(object.id, "after_create", { id: rec.id, data: coerced });
        toast(`${object.label} created`, "success");
      }
      if (onClose) onClose();
      router.push(`/o/${object.api_name}/${rec.id}`);
      router.refresh();
    } catch (e: any) {
      setErrors([e.message || "Failed to save"]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {errors.length > 0 && (
        <div className="card" style={{ borderColor: "var(--sf-red)", marginBottom: "1rem" }}>
          <div className="card-body" style={{ color: "var(--sf-red)", padding: "0.75rem 1rem" }}>
            {errors.map((e, i) => (
              <div key={i}>• {e}</div>
            ))}
          </div>
        </div>
      )}
      <div className="form-grid">
        {editable.map((f) => (
          <div key={f.id} className={`field ${f.type === "textarea" ? "field-full" : ""}`}>
            <label>
              {f.required && <span className="required-star">* </span>}
              {f.label}
            </label>
            <FieldInput field={f} value={data[f.api_name]} onChange={(v) => setField(f.api_name, v)} />
            {f.help_text && <span className="muted" style={{ fontSize: "0.72rem" }}>{f.help_text}</span>}
          </div>
        ))}
      </div>
      <div className="flex gap mt" style={{ justifyContent: "flex-end" }}>
        {onClose && <button className="btn" onClick={onClose} disabled={saving}>Cancel</button>}
        <button className="btn btn-brand" onClick={save} disabled={saving}>
          {saving ? <Icon name="Loader2" className="spinner" size={14} /> : <Icon name="Save" size={14} />}
          {isEdit ? "Save" : "Create"}
        </button>
      </div>
    </div>
  );
}
