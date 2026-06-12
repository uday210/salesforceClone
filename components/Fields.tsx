"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { SfField } from "@/lib/types";
import { formatValue } from "@/lib/format";
import { listRecords } from "@/lib/records";
import { getObjectById } from "@/lib/metadata";

// ---------- Editable input for a field ----------
export function FieldInput({
  field, value, onChange,
}: {
  field: SfField;
  value: any;
  onChange: (v: any) => void;
}) {
  if (field.type === "lookup" && field.reference_object_id) {
    return <LookupInput field={field} value={value} onChange={onChange} />;
  }
  if (field.type === "picklist") {
    return (
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">--None--</option>
        {field.picklist_values.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>
    );
  }
  if (field.type === "textarea") {
    return <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
  }
  if (field.type === "checkbox") {
    return (
      <input
        type="checkbox"
        style={{ width: "auto", height: "auto" }}
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
      />
    );
  }
  const typeMap: Record<string, string> = {
    number: "number", currency: "number", percent: "number",
    date: "date", datetime: "datetime-local", email: "email",
    phone: "tel", url: "url",
  };
  return (
    <input
      type={typeMap[field.type] || "text"}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function LookupInput({ field, value, onChange }: { field: SfField; value: any; onChange: (v: any) => void }) {
  const [options, setOptions] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    (async () => {
      if (!field.reference_object_id) return;
      const recs = await listRecords(field.reference_object_id, { limit: 200 });
      setOptions(recs.map((r) => ({ id: r.id, name: r.name || "Untitled" })));
    })();
  }, [field.reference_object_id]);
  return (
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
      <option value="">--None--</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>{o.name}</option>
      ))}
    </select>
  );
}

// ---------- Read-only display for a field ----------
export function FieldDisplay({ field, value }: { field: SfField; value: any }) {
  const [lookupName, setLookupName] = useState<string | null>(null);
  const [lookupApi, setLookupApi] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (field.type === "lookup" && value && field.reference_object_id) {
        const { getRecord } = await import("@/lib/records");
        const rec = await getRecord(value);
        setLookupName(rec?.name || null);
        const obj = await getObjectById(field.reference_object_id);
        setLookupApi(obj?.api_name || null);
      }
    })();
  }, [field, value]);

  if (field.type === "picklist") {
    const opt = field.picklist_values.find((p) => p.value === value);
    if (!value) return <span className="field-display-value">—</span>;
    return (
      <span className="badge" style={opt?.color ? { color: opt.color } : undefined}>
        {opt?.color && <span className="badge-dot" />} {opt?.label || value}
      </span>
    );
  }
  if (field.type === "lookup" && value) {
    return (
      <span className="field-display-value">
        {lookupApi ? <Link href={`/o/${lookupApi}/${value}`}>{lookupName || "…"}</Link> : lookupName || value}
      </span>
    );
  }
  if (field.type === "url" && value) {
    return <a className="field-display-value" href={value} target="_blank" rel="noreferrer">{value}</a>;
  }
  if (field.type === "email" && value) {
    return <a className="field-display-value" href={`mailto:${value}`}>{value}</a>;
  }
  return <span className="field-display-value">{formatValue(field, value, lookupName || undefined)}</span>;
}
