"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Icon } from "@/lib/icons";
import LwcHost from "@/components/LwcHost";
import type { SfLwcComponent } from "@/lib/types";

export default function LwcTabPage() {
  const id = String(useParams().id);
  const [cmp, setCmp] = useState<SfLwcComponent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("sf_lwc_components").select("*").eq("id", id).single();
      setCmp(data as SfLwcComponent);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="center-screen" style={{ minHeight: "50vh" }}><div className="spinner" /></div>;
  if (!cmp) return <div className="page"><div className="empty-state">Component not found.</div></div>;

  return (
    <div className="page">
      <div className="record-header">
        <span className="record-icon" style={{ background: "var(--brand)" }}><Icon name="FileCode" size={20} /></span>
        <div><div className="eyebrow">Lightning Component</div><h1>{cmp.label || cmp.name}</h1></div>
      </div>
      <div className="card"><div className="card-body">
        <LwcHost html={cmp.html} js={cmp.js} css={cmp.css} height={560} />
      </div></div>
    </div>
  );
}
