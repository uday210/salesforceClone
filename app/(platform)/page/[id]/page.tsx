"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Icon } from "@/lib/icons";
import { ComponentRenderer } from "@/components/LightningRenderer";
import type { SfLightningPage } from "@/lib/types";

export default function LightningPageView() {
  const id = String(useParams().id);
  const [page, setPage] = useState<SfLightningPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("sf_lightning_pages").select("*").eq("id", id).single();
      setPage(data as SfLightningPage);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="center-screen" style={{ minHeight: "50vh" }}><div className="spinner" /></div>;
  if (!page) return <div className="page"><div className="empty-state">Page not found.</div></div>;

  const hasSidebar = (page.regions.sidebar || []).length > 0;

  return (
    <div className="page">
      <div className="record-header">
        <span className="record-icon" style={{ background: "var(--sf-blue)" }}><Icon name="Layers" size={20} /></span>
        <div><div className="eyebrow">{page.type} page</div><h1>{page.name}</h1></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: hasSidebar ? "2fr 1fr" : "1fr", gap: "0.75rem", alignItems: "start" }}>
        <div>{(page.regions.main || []).map((c) => <ComponentRenderer key={c.id} comp={c} />)}</div>
        {hasSidebar && <div>{(page.regions.sidebar || []).map((c) => <ComponentRenderer key={c.id} comp={c} />)}</div>}
      </div>
    </div>
  );
}
