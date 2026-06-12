"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Icon } from "@/lib/icons";
import { useToast } from "@/components/Toast";
import LwcHost from "@/components/LwcHost";
import type { SfLwcComponent } from "@/lib/types";

const SAMPLE_HTML = `<div class="greeting">
  <h2>Hello!</h2>
  <button id="btn">Click me</button>
  <p id="count">Clicks: 0</p>
  <p id="apex">Loading Apex…</p>
</div>`;
const SAMPLE_JS = `// Lifecycle hooks (like LWC): connectedCallback, renderedCallback, disconnectedCallback
let count = 0;

function connectedCallback() {
  // runs when the component is inserted — like LWC connectedCallback()
  document.querySelector('.greeting h2').textContent = 'Hello, Trailblazer!';
  document.getElementById('btn').addEventListener('click', onClick);
  loadAccounts();
}

function renderedCallback() {
  // runs after the DOM has rendered
  console.log('rendered');
}

function disconnectedCallback() {
  // cleanup when removed
}

function onClick() {
  count++;
  document.getElementById('count').textContent = 'Clicks: ' + count;
}

// Call an Apex class method from the component (imperative Apex):
async function loadAccounts() {
  try {
    const rows = await callApex('AccountService', 'topAccounts');
    document.getElementById('apex').textContent = 'Top accounts: ' + rows.map(r => r.Name).join(', ');
  } catch (e) {
    document.getElementById('apex').textContent = 'Apex error: ' + e.message;
  }
}`;
const SAMPLE_CSS = `.greeting { font-family: sans-serif; padding: 1rem; }
button { background:#0176d3;color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer; }`;

export default function LwcPage() {
  const [comps, setComps] = useState<SfLwcComponent[]>([]);
  const [sel, setSel] = useState<SfLwcComponent | null>(null);
  const [tab, setTab] = useState<"html" | "js" | "css">("html");
  const toast = useToast();

  async function reload() {
    const { data } = await supabase.from("sf_lwc_components").select("*").order("name");
    setComps((data as SfLwcComponent[]) || []);
  }
  useEffect(() => { reload(); }, []);

  async function create() {
    const name = prompt("Component name (camelCase):");
    if (!name) return;
    const { data } = await supabase.from("sf_lwc_components").insert({
      name, label: name, html: SAMPLE_HTML, js: SAMPLE_JS, css: SAMPLE_CSS,
    }).select().single();
    await reload(); setSel(data as SfLwcComponent);
  }
  async function save() {
    if (!sel) return;
    await supabase.from("sf_lwc_components").update({ html: sel.html, js: sel.js, css: sel.css }).eq("id", sel.id);
    toast("Saved", "success");
  }
  async function del() {
    if (!sel || !confirm("Delete component?")) return;
    await supabase.from("sf_lwc_components").delete().eq("id", sel.id);
    setSel(null); reload();
  }

  return (
    <div>
      <div className="flex items-center mb" style={{ justifyContent: "space-between" }}>
        <h1>Lightning Web Components</h1>
        <button className="btn btn-brand" onClick={create}><Icon name="Plus" size={14} /> New Component</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr", gap: "0.75rem", alignItems: "start" }}>
        <div className="card"><div className="card-body" style={{ padding: "0.5rem" }}>
          {comps.map((c) => (
            <div key={c.id} className="palette-item" style={sel?.id === c.id ? { borderColor: "var(--sf-blue)" } : {}} onClick={() => setSel(c)}>
              <Icon name="FileCode" size={13} /> {c.name}
            </div>
          ))}
          {!comps.length && <p className="muted" style={{ padding: "0.5rem" }}>No components.</p>}
        </div></div>

        {sel ? (
          <>
            <div className="card">
              <div className="card-header">
                <div className="nav-bar" style={{ boxShadow: "none", border: "none", padding: 0 }}>
                  {(["html", "js", "css"] as const).map((t) => (
                    <a key={t} className={`nav-tab ${tab === t ? "active" : ""}`} style={{ height: 32, cursor: "pointer" }} onClick={() => setTab(t)}>{t.toUpperCase()}</a>
                  ))}
                </div>
                <div className="ml-auto flex gap">
                  <button className="btn btn-sm btn-danger" onClick={del}><Icon name="Trash2" size={12} /></button>
                  <button className="btn btn-brand btn-sm" onClick={save}><Icon name="Save" size={12} /> Save</button>
                </div>
              </div>
              <div className="card-body">
                <textarea className="code-editor" value={(sel as any)[tab]} onChange={(e) => setSel({ ...sel, [tab]: e.target.value })} />
              </div>
            </div>
            <div className="card">
              <div className="card-header"><Icon name="Eye" size={16} /><h3>Preview</h3></div>
              <div className="card-body">
                <LwcHost html={sel.html} js={sel.js} css={sel.css} />
              </div>
            </div>
          </>
        ) : (
          <div className="card" style={{ gridColumn: "span 2" }}><div className="empty-state">Select or create a component.</div></div>
        )}
      </div>
    </div>
  );
}
