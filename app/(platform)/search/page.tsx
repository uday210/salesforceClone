"use client";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getObjects } from "@/lib/metadata";
import { Icon } from "@/lib/icons";
import type { SfObject, SfRecord } from "@/lib/types";

function SearchResults() {
  const sp = useSearchParams();
  const q = sp.get("q") || "";
  const [results, setResults] = useState<{ obj: SfObject; recs: SfRecord[] }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const objs = await getObjects();
      const objById = Object.fromEntries(objs.map((o) => [o.id, o]));
      const { data } = await supabase
        .from("sf_records")
        .select("*")
        .ilike("name", `%${q}%`)
        .limit(100);
      const grouped: Record<string, SfRecord[]> = {};
      ((data as SfRecord[]) || []).forEach((r) => {
        (grouped[r.object_id] ||= []).push(r);
      });
      setResults(
        Object.entries(grouped).map(([oid, recs]) => ({ obj: objById[oid], recs })).filter((g) => g.obj)
      );
      setLoading(false);
    })();
  }, [q]);

  if (loading) return <div className="center-screen" style={{ minHeight: "50vh" }}><div className="spinner" /></div>;

  const total = results.reduce((s, g) => s + g.recs.length, 0);

  return (
    <div className="page">
      <div className="record-header">
        <span className="record-icon" style={{ background: "var(--sf-blue)" }}><Icon name="Search" size={20} /></span>
        <div>
          <div className="eyebrow">Search Results</div>
          <h1>“{q}” — {total} result{total !== 1 ? "s" : ""}</h1>
        </div>
      </div>
      {results.length === 0 ? (
        <div className="empty-state">No records match your search.</div>
      ) : (
        results.map((g) => (
          <div key={g.obj.id} className="card mb">
            <div className="card-header"><Icon name={g.obj.icon} size={16} /><h3>{g.obj.plural_label} ({g.recs.length})</h3></div>
            <div className="card-body" style={{ padding: 0 }}>
              <table className="data-table">
                <tbody>
                  {g.recs.map((r) => (
                    <tr key={r.id}>
                      <td><Link href={`/o/${g.obj.api_name}/${r.id}`}>{r.name}</Link></td>
                      <td className="muted">{new Date(r.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="center-screen" style={{ minHeight: "50vh" }}><div className="spinner" /></div>}>
      <SearchResults />
    </Suspense>
  );
}
