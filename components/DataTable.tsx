"use client";
import Link from "next/link";
import type { SfObject, SfField, SfRecord } from "@/lib/types";
import { FieldDisplay } from "./Fields";

export default function DataTable({
  object, fields, records, columns,
}: {
  object: SfObject;
  fields: SfField[];
  records: SfRecord[];
  columns: string[];
}) {
  const cols = columns
    .map((c) => fields.find((f) => f.api_name === c))
    .filter(Boolean) as SfField[];
  const colsToShow = cols.length ? cols : fields.slice(0, 5);

  if (!records.length) {
    return <div className="empty-state">No {object.plural_label.toLowerCase()} to display. Create one to get started.</div>;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {colsToShow.map((f) => (
              <th key={f.id}>{f.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id}>
              {colsToShow.map((f, idx) => (
                <td key={f.id}>
                  {idx === 0 ? (
                    <Link href={`/o/${object.api_name}/${r.id}`}>
                      {f.api_name === "Name" || f.api_name === "LastName" || f.api_name === "Subject"
                        ? r.name || "Untitled"
                        : <FieldDisplay field={f} value={r.data[f.api_name]} />}
                    </Link>
                  ) : (
                    <FieldDisplay field={f} value={r.data[f.api_name]} />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
