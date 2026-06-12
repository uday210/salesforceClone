"use client";
import { useState } from "react";
import Link from "next/link";
import type { SfObject, SfField, SfRecord } from "@/lib/types";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "./Toast";

export default function KanbanBoard({
  object, field, records: initial,
}: {
  object: SfObject;
  field: SfField; // a picklist field to group by
  records: SfRecord[];
}) {
  const [records, setRecords] = useState(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const toast = useToast();

  const columns = field.picklist_values.length
    ? field.picklist_values.map((p) => p.value)
    : Array.from(new Set(records.map((r) => r.data[field.api_name]).filter(Boolean)));

  async function drop(stage: string) {
    setOverCol(null);
    if (!dragId) return;
    const rec = records.find((r) => r.id === dragId);
    if (!rec || rec.data[field.api_name] === stage) return;
    const newData = { ...rec.data, [field.api_name]: stage };
    setRecords((rs) => rs.map((r) => (r.id === dragId ? { ...r, data: newData } : r)));
    setDragId(null);
    const { error } = await supabase.from("sf_records").update({ data: newData }).eq("id", rec.id);
    if (error) toast("Failed to update", "error");
    else toast(`${object.label} moved to ${stage}`, "success");
  }

  const amountField = "Amount";

  return (
    <div className="kanban">
      {columns.map((stage) => {
        const inCol = records.filter((r) => r.data[field.api_name] === stage);
        const sum = inCol.reduce((s, r) => s + (Number(r.data[amountField]) || 0), 0);
        return (
          <div
            key={stage}
            className={`kanban-col ${overCol === stage ? "drag-over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setOverCol(stage); }}
            onDragLeave={() => setOverCol((c) => (c === stage ? null : c))}
            onDrop={() => drop(stage)}
          >
            <div className="kanban-col-header">
              <span>{stage}</span>
              <span>{inCol.length}{sum ? ` · $${(sum / 1000).toFixed(0)}k` : ""}</span>
            </div>
            <div className="kanban-col-body">
              {inCol.map((r) => (
                <div
                  key={r.id}
                  className="kanban-card"
                  draggable
                  onDragStart={() => setDragId(r.id)}
                >
                  <Link href={`/o/${object.api_name}/${r.id}`} className="title">{r.name || "Untitled"}</Link>
                  {r.data[amountField] != null && (
                    <div className="meta">${Number(r.data[amountField]).toLocaleString()}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
