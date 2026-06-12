"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getTabs } from "@/lib/metadata";
import { Icon } from "@/lib/icons";
import { useToast } from "@/components/Toast";
import type { SfApp, SfTab } from "@/lib/types";

export default function AppEditor() {
  const id = String(useParams().id);
  const toast = useToast();
  const [app, setApp] = useState<SfApp | null>(null);
  const [tabs, setTabs] = useState<SfTab[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("sf_apps").select("*").eq("id", id).single();
      setApp(data as SfApp);
      setSelected((data as SfApp).nav_items || []);
      setTabs(await getTabs());
    })();
  }, [id]);

  function move(i: number, dir: -1 | 1) {
    const next = [...selected];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setSelected(next);
  }
  function add(tabId: string) { if (!selected.includes(tabId)) setSelected([...selected, tabId]); }
  function remove(tabId: string) { setSelected(selected.filter((t) => t !== tabId)); }

  async function save() {
    await supabase.from("sf_apps").update({ nav_items: selected }).eq("id", id);
    toast("App navigation saved", "success");
  }

  if (!app) return <div className="spinner" />;
  const tabById = Object.fromEntries(tabs.map((t) => [t.id, t]));
  const available = tabs.filter((t) => !selected.includes(t.id));

  return (
    <div>
      <div className="flex items-center gap mb">
        <span className="record-icon" style={{ background: app.color }}><Icon name={app.icon} size={18} /></span>
        <div><div className="eyebrow muted">Lightning App</div><h1>{app.label}</h1></div>
        <button className="btn btn-brand ml-auto" onClick={save}><Icon name="Save" size={14} /> Save</button>
      </div>
      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="card">
          <div className="card-header"><h3>Selected Tabs (nav order)</h3></div>
          <div className="card-body">
            {selected.map((tid, i) => (
              <div key={tid} className="flex items-center gap mb" style={{ border: "1px solid var(--sf-border)", borderRadius: "var(--radius)", padding: "0.4rem 0.6rem" }}>
                <Icon name={tabById[tid]?.icon || "Box"} size={14} />
                <span>{tabById[tid]?.label || "Unknown tab"}</span>
                <div className="ml-auto flex gap-sm">
                  <button className="btn-icon btn-sm" onClick={() => move(i, -1)}><Icon name="ChevronRight" size={12} className="" /></button>
                  <button className="btn-icon btn-sm" onClick={() => move(i, 1)}><Icon name="ChevronDown" size={12} /></button>
                  <button className="btn-icon btn-sm" onClick={() => remove(tid)}><Icon name="X" size={12} /></button>
                </div>
              </div>
            ))}
            {!selected.length && <p className="muted">No tabs yet — add some from the right.</p>}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3>Available Tabs</h3></div>
          <div className="card-body">
            {available.map((t) => (
              <div key={t.id} className="flex items-center gap mb" style={{ border: "1px solid var(--sf-border)", borderRadius: "var(--radius)", padding: "0.4rem 0.6rem" }}>
                <Icon name={t.icon} size={14} /><span>{t.label}</span>
                <button className="btn btn-sm ml-auto" onClick={() => add(t.id)}><Icon name="Plus" size={12} /> Add</button>
              </div>
            ))}
            {!available.length && <p className="muted">All tabs are in use.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
