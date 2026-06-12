"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { SfField } from "@/lib/types";
import { formatValue } from "@/lib/format";
import { evalFormula, formatFormulaResult } from "@/lib/formula";
import { getObjectById } from "@/lib/metadata";
import { Icon } from "@/lib/icons";

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
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [refIcon, setRefIcon] = useState("Box");

  // resolve the icon + current selection's display name
  useEffect(() => {
    (async () => {
      if (!field.reference_object_id) return;
      const obj = await getObjectById(field.reference_object_id);
      if (obj) setRefIcon(obj.icon);
      if (value) {
        const { getRecord } = await import("@/lib/records");
        const rec = await getRecord(value);
        setSelectedName(rec?.name || null);
      } else {
        setSelectedName(null);
      }
    })();
  }, [field.reference_object_id, value]);

  // live search as the user types
  useEffect(() => {
    if (!open || !field.reference_object_id) return;
    let active = true;
    (async () => {
      const { supabase } = await import("@/lib/supabaseClient");
      let q = supabase.from("sf_records").select("id,name").eq("object_id", field.reference_object_id).limit(8);
      if (query.trim()) q = q.ilike("name", `%${query.trim()}%`);
      const { data } = await q;
      if (active) setResults((data as any[])?.map((r) => ({ id: r.id, name: r.name || "Untitled" })) || []);
    })();
    return () => { active = false; };
  }, [query, open, field.reference_object_id]);

  if (value && selectedName !== null) {
    return (
      <div className="lookup-pill">
        <span className="lookup-pill-icon"><Icon name={refIcon} size={12} /></span>
        <span style={{ flex: 1 }}>{selectedName}</span>
        <button type="button" className="lookup-clear" onClick={() => { onChange(null); setSelectedName(null); setQuery(""); }} aria-label="Clear">
          <Icon name="X" size={12} />
        </button>
      </div>
    );
  }

  return (
    <div className="lookup-search">
      <span className="lookup-search-icon"><Icon name="Search" size={14} /></span>
      <input
        value={query}
        placeholder="Search…"
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && results.length > 0 && (
        <div className="lookup-results">
          {results.map((r) => (
            <div key={r.id} className="lookup-result" onMouseDown={() => { onChange(r.id); setSelectedName(r.name); setOpen(false); }}>
              <span className="lookup-pill-icon"><Icon name={refIcon} size={12} /></span> {r.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Read-only display for a field ----------
export function FieldDisplay({ field, value, data }: { field: SfField; value: any; data?: Record<string, any> }) {
  if (field.type === "formula") {
    return <FormulaDisplay field={field} data={data || {}} />;
  }
  return <FieldDisplayInner field={field} value={value} />;
}

function FormulaDisplay({ field, data }: { field: SfField; data: Record<string, any> }) {
  const result = formatFormulaResult(evalFormula(field.formula || "", data));
  return <span className="field-display-value" style={result.startsWith("#ERROR") ? { color: "var(--sf-red)" } : undefined}>{result}</span>;
}

function FieldDisplayInner({ field, value }: { field: SfField; value: any }) {
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
