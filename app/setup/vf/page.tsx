"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Icon } from "@/lib/icons";
import { useToast } from "@/components/Toast";
import type { SfVfPage } from "@/lib/types";

const SAMPLE = `<apex:page>
  <apex:pageBlock title="Account Summary">
    <apex:pageBlockSection>
      <p>Welcome to your Visualforce-style page.</p>
      <p>Merge field example: {!$User.Name}</p>
    </apex:pageBlockSection>
  </apex:pageBlock>
</apex:page>`;

// Very small VF-style markup -> HTML transformer (demonstration only)
function renderVf(markup: string): string {
  return markup
    .replace(/<apex:page[^>]*>/gi, '<div class="vf-page">')
    .replace(/<\/apex:page>/gi, "</div>")
    .replace(/<apex:pageBlock(?:\s+title="([^"]*)")?[^>]*>/gi, (_m, t) => `<div class="card"><div class="card-header"><h3>${t || "Page Block"}</h3></div><div class="card-body">`)
    .replace(/<\/apex:pageBlock>/gi, "</div></div>")
    .replace(/<apex:pageBlockSection[^>]*>/gi, '<div class="vf-section">')
    .replace(/<\/apex:pageBlockSection>/gi, "</div>")
    .replace(/\{!\$User\.Name\}/gi, "Current User")
    .replace(/\{![^}]*\}/g, "<em>(merge field)</em>");
}

export default function VfPage() {
  const [pages, setPages] = useState<SfVfPage[]>([]);
  const [sel, setSel] = useState<SfVfPage | null>(null);
  const toast = useToast();

  async function reload() {
    const { data } = await supabase.from("sf_vf_pages").select("*").order("name");
    setPages((data as SfVfPage[]) || []);
  }
  useEffect(() => { reload(); }, []);

  async function create() {
    const name = prompt("Page name:");
    if (!name) return;
    const { data } = await supabase.from("sf_vf_pages").insert({ name, label: name, markup: SAMPLE }).select().single();
    await reload(); setSel(data as SfVfPage);
  }
  async function save() {
    if (!sel) return;
    await supabase.from("sf_vf_pages").update({ markup: sel.markup }).eq("id", sel.id);
    toast("Saved", "success");
  }
  async function del() {
    if (!sel || !confirm("Delete page?")) return;
    await supabase.from("sf_vf_pages").delete().eq("id", sel.id);
    setSel(null); reload();
  }

  return (
    <div>
      <div className="flex items-center mb" style={{ justifyContent: "space-between" }}>
        <h1>Visualforce Pages</h1>
        <button className="btn btn-brand" onClick={create}><Icon name="Plus" size={14} /> New Page</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr", gap: "0.75rem", alignItems: "start" }}>
        <div className="card"><div className="card-body" style={{ padding: "0.5rem" }}>
          {pages.map((p) => (
            <div key={p.id} className="palette-item" style={sel?.id === p.id ? { borderColor: "var(--sf-blue)" } : {}} onClick={() => setSel(p)}>
              <Icon name="FileCode" size={13} /> {p.name}
            </div>
          ))}
          {!pages.length && <p className="muted" style={{ padding: "0.5rem" }}>No pages.</p>}
        </div></div>

        {sel ? (
          <>
            <div className="card">
              <div className="card-header"><Icon name="Code2" size={16} /><h3>{sel.name}.vfp</h3>
                <div className="ml-auto flex gap">
                  <button className="btn btn-sm btn-danger" onClick={del}><Icon name="Trash2" size={12} /></button>
                  <button className="btn btn-brand btn-sm" onClick={save}><Icon name="Save" size={12} /> Save</button>
                </div>
              </div>
              <div className="card-body"><textarea className="code-editor" value={sel.markup} onChange={(e) => setSel({ ...sel, markup: e.target.value })} /></div>
            </div>
            <div className="card">
              <div className="card-header"><Icon name="Eye" size={16} /><h3>Rendered</h3></div>
              <div className="card-body"><div dangerouslySetInnerHTML={{ __html: renderVf(sel.markup) }} /></div>
            </div>
          </>
        ) : (
          <div className="card" style={{ gridColumn: "span 2" }}><div className="empty-state">Select or create a page.</div></div>
        )}
      </div>
    </div>
  );
}
