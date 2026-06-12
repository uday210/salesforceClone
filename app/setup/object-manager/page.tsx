"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getObjects } from "@/lib/metadata";
import { Icon } from "@/lib/icons";
import type { SfObject } from "@/lib/types";

export default function ObjectManagerPage() {
  const [objects, setObjects] = useState<SfObject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getObjects(true).then((o) => { setObjects(o); setLoading(false); });
  }, []);

  return (
    <div>
      <div className="flex items-center mb" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>Object Manager</h1>
          <p className="muted">{objects.length} objects</p>
        </div>
        <Link href="/setup/object-manager/new" className="btn btn-brand"><Icon name="Plus" size={14} /> Create Object</Link>
      </div>
      {loading ? <div className="spinner" /> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Label</th><th>API Name</th><th>Type</th><th>Record Types</th></tr></thead>
            <tbody>
              {objects.map((o) => (
                <tr key={o.id}>
                  <td><Link href={`/setup/object-manager/${o.api_name}`}><Icon name={o.icon} size={14} /> {o.label}</Link></td>
                  <td className="muted">{o.api_name}</td>
                  <td>{o.is_custom ? <span className="badge">Custom</span> : <span className="badge">Standard</span>}</td>
                  <td>{o.enable_record_types ? "Enabled" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
