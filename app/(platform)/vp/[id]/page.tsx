"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Icon } from "@/lib/icons";
import { renderVf } from "@/lib/vf";
import type { SfVfPage } from "@/lib/types";

export default function VfTabPage() {
  const id = String(useParams().id);
  const [page, setPage] = useState<SfVfPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("sf_vf_pages").select("*").eq("id", id).single();
      setPage(data as SfVfPage);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="center-screen" style={{ minHeight: "50vh" }}><div className="spinner" /></div>;
  if (!page) return <div className="page"><div className="empty-state">Page not found.</div></div>;

  return (
    <div className="page">
      <div className="record-header">
        <span className="record-icon" style={{ background: "var(--brand)" }}><Icon name="FileCode" size={20} /></span>
        <div><div className="eyebrow">Visualforce Page</div><h1>{page.label || page.name}</h1></div>
      </div>
      <div dangerouslySetInnerHTML={{ __html: renderVf(page.markup) }} />
    </div>
  );
}
