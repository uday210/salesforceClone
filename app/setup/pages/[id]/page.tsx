"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getObjects } from "@/lib/metadata";
import { Icon } from "@/lib/icons";
import { useToast } from "@/components/Toast";
import { COMPONENT_TYPES, ComponentRenderer } from "@/components/LightningRenderer";
import type { SfLightningPage, SfObject, PageComponent } from "@/lib/types";

type RegionKey = "main" | "sidebar";

export default function PageBuilder() {
  const id = String(useParams().id);
  const toast = useToast();
  const [page, setPage] = useState<SfLightningPage | null>(null);
  const [objects, setObjects] = useState<SfObject[]>([]);
  const [regions, setRegions] = useState<{ main: PageComponent[]; sidebar: PageComponent[] }>({ main: [], sidebar: [] });
  const [selected, setSelected] = useState<{ region: RegionKey; id: string } | null>(null);
  const [dragType, setDragType] = useState<string | null>(null);
  const [over, setOver] = useState<RegionKey | null>(null);
  const [preview, setPreview] = useState(false);
  const [isDefault, setIsDefault] = useState(false);

  async function activate() {
    if (!page) return;
    if (page.type === "record" && page.object_id) {
      await supabase.from("sf_lightning_pages").update({ is_default: false }).eq("type", "record").eq("object_id", page.object_id).neq("id", id);
    }
    await supabase.from("sf_lightning_pages").update({ is_default: true, active: true, regions }).eq("id", id);
    setIsDefault(true);
    toast(page.type === "record" ? "Activated as the org default record page" : "Activated", "success");
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("sf_lightning_pages").select("*").eq("id", id).single();
      const p = data as SfLightningPage;
      setPage(p);
      setRegions(p.regions || { main: [], sidebar: [] });
      setIsDefault(p.is_default);
      setObjects(await getObjects());
    })();
  }, [id]);

  function drop(region: RegionKey) {
    setOver(null);
    if (!dragType) return;
    const comp: PageComponent = { id: crypto.randomUUID(), type: dragType, props: {} };
    setRegions((r) => ({ ...r, [region]: [...r[region], comp] }));
    setDragType(null);
  }
  function removeComp(region: RegionKey, compId: string) {
    setRegions((r) => ({ ...r, [region]: r[region].filter((c) => c.id !== compId) }));
    if (selected?.id === compId) setSelected(null);
  }
  function updateProps(props: Record<string, any>) {
    if (!selected) return;
    setRegions((r) => ({
      ...r,
      [selected.region]: r[selected.region].map((c) => (c.id === selected.id ? { ...c, props } : c)),
    }));
  }
  async function save() {
    await supabase.from("sf_lightning_pages").update({ regions }).eq("id", id);
    toast("Page saved", "success");
  }

  if (!page) return <div className="spinner" />;
  const selectedComp = selected ? regions[selected.region].find((c) => c.id === selected.id) : null;

  return (
    <div>
      <div className="flex items-center gap mb">
        <span className="record-icon" style={{ background: "var(--sf-blue)" }}><Icon name="Layers" size={18} /></span>
        <div><div className="eyebrow muted">{page.type} page {isDefault && <span className="badge" style={{ color: "var(--sf-green)" }}>Active</span>}</div><h1>{page.name}</h1></div>
        <button className={`btn ml-auto ${preview ? "btn-brand" : ""}`} onClick={() => setPreview((p) => !p)}><Icon name="Eye" size={14} /> {preview ? "Editing off" : "Preview"}</button>
        <button className="btn" onClick={activate}><Icon name="Check" size={14} /> Activate</button>
        <button className="btn btn-brand" onClick={save}><Icon name="Save" size={14} /> Save</button>
      </div>

      {preview ? (
        <div style={{ display: "grid", gridTemplateColumns: regions.sidebar.length ? "2fr 1fr" : "1fr", gap: "0.75rem", alignItems: "start", background: "#f3f3f3", padding: "1rem", borderRadius: "0.5rem" }}>
          <div>{regions.main.map((c) => <ComponentRenderer key={c.id} comp={c} />)}</div>
          {regions.sidebar.length > 0 && <div>{regions.sidebar.map((c) => <ComponentRenderer key={c.id} comp={c} />)}</div>}
        </div>
      ) : (
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 260px", gap: "0.75rem", alignItems: "start" }}>
        {/* Palette */}
        <div className="card">
          <div className="card-header"><h3>Components</h3></div>
          <div className="card-body">
            {COMPONENT_TYPES.map((c) => (
              <div key={c.type} className="palette-item" draggable onDragStart={() => setDragType(c.type)}>
                <Icon name={c.icon} size={13} /> {c.label}
              </div>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0.75rem" }}>
            {(["main", "sidebar"] as RegionKey[]).map((region) => (
              <div key={region}>
                <div className="section-title">{region === "main" ? "Main Region" : "Sidebar"}</div>
                <div
                  className={`canvas-region ${over === region ? "drag-over" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setOver(region); }}
                  onDragLeave={() => setOver((o) => (o === region ? null : o))}
                  onDrop={() => drop(region)}
                >
                  {regions[region].map((c) => (
                    <div
                      key={c.id}
                      className={`canvas-comp ${selected?.id === c.id ? "selected" : ""}`}
                      onClick={() => setSelected({ region, id: c.id })}
                    >
                      <div className="flex items-center gap-sm">
                        <Icon name={COMPONENT_TYPES.find((t) => t.type === c.type)?.icon || "Box"} size={13} />
                        <strong style={{ fontSize: "0.8rem" }}>{c.props.title || COMPONENT_TYPES.find((t) => t.type === c.type)?.label}</strong>
                        <button className="btn-icon btn-sm ml-auto" onClick={(e) => { e.stopPropagation(); removeComp(region, c.id); }}><Icon name="X" size={12} /></button>
                      </div>
                    </div>
                  ))}
                  {!regions[region].length && <p className="muted" style={{ textAlign: "center", padding: "1rem" }}>Drag components here</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Properties */}
        <div className="card">
          <div className="card-header"><h3>Properties</h3></div>
          <div className="card-body">
            {selectedComp ? (
              <PropsEditor comp={selectedComp} objects={objects} onChange={updateProps} />
            ) : (
              <p className="muted">Select a component to edit its properties.</p>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

function PropsEditor({ comp, objects, onChange }: { comp: PageComponent; objects: SfObject[]; onChange: (p: Record<string, any>) => void }) {
  const p = comp.props;
  const set = (k: string, v: any) => onChange({ ...p, [k]: v });

  return (
    <div>
      <div className="field mb"><label>Title</label><input value={p.title || ""} onChange={(e) => set("title", e.target.value)} /></div>
      {comp.type === "rich_text" && (
        <div className="field"><label>HTML</label><textarea value={p.html || ""} onChange={(e) => set("html", e.target.value)} /></div>
      )}
      {(comp.type === "report_chart" || comp.type === "list_view") && (
        <div className="field mb"><label>Object</label>
          <select value={p.object_id || ""} onChange={(e) => set("object_id", e.target.value)}>
            <option value="">--Select--</option>
            {objects.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
      )}
      {comp.type === "report_chart" && (
        <>
          <div className="field mb"><label>Group Field (api name)</label><input value={p.group_field || ""} onChange={(e) => set("group_field", e.target.value)} placeholder="StageName" /></div>
          <div className="field mb"><label>Measure</label>
            <select value={p.measure || "count"} onChange={(e) => set("measure", e.target.value)}><option value="count">Record Count</option><option value="amount">Sum of Amount</option></select>
          </div>
          <div className="field"><label>Chart Type</label>
            <select value={p.chart || "bar"} onChange={(e) => set("chart", e.target.value)}><option value="bar">Bar</option><option value="donut">Donut</option></select>
          </div>
        </>
      )}
    </div>
  );
}
