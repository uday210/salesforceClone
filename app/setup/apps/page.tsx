"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Icon } from "@/lib/icons";
import { apiNameFromLabel } from "@/lib/format";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import type { SfApp } from "@/lib/types";

const ICONS = ["Briefcase", "AppWindow", "Building2", "TrendingUp", "Star", "Database"];
const COLORS = ["#0176d3", "#2e844a", "#fe9339", "#9050e9", "#ba0517"];

export default function AppsPage() {
  const [apps, setApps] = useState<SfApp[]>([]);
  const [show, setShow] = useState(false);
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("Briefcase");
  const [color, setColor] = useState("#0176d3");
  const toast = useToast();

  async function reload() {
    const { data } = await supabase.from("sf_apps").select("*").order("label");
    setApps((data as SfApp[]) || []);
  }
  useEffect(() => { reload(); }, []);

  async function create() {
    if (!label) return;
    await supabase.from("sf_apps").insert({ api_name: apiNameFromLabel(label), label, icon, color, nav_items: [] });
    setShow(false); setLabel("");
    toast("App created", "success");
    reload();
  }

  return (
    <div>
      <div className="flex items-center mb" style={{ justifyContent: "space-between" }}>
        <div><h1>App Manager</h1><p className="muted">{apps.length} apps</p></div>
        <button className="btn btn-brand" onClick={() => setShow(true)}><Icon name="Plus" size={14} /> New App</button>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>App</th><th>API Name</th><th>Tabs</th><th>Default</th></tr></thead>
          <tbody>
            {apps.map((a) => (
              <tr key={a.id}>
                <td><Link href={`/setup/apps/${a.id}`}><span className="badge" style={{ background: a.color, color: "#fff" }}><Icon name={a.icon} size={12} /></span> {a.label}</Link></td>
                <td className="muted">{a.api_name}</td>
                <td>{a.nav_items?.length || 0}</td>
                <td>{a.is_default ? "✓" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {show && (
        <Modal title="New Lightning App" onClose={() => setShow(false)} footer={<><button className="btn" onClick={() => setShow(false)}>Cancel</button><button className="btn btn-brand" onClick={create}>Save</button></>}>
          <div className="form-grid">
            <div className="field field-full"><label>App Name *</label><input value={label} onChange={(e) => setLabel(e.target.value)} /></div>
            <div className="field"><label>Icon</label><select value={icon} onChange={(e) => setIcon(e.target.value)}>{ICONS.map((i) => <option key={i}>{i}</option>)}</select></div>
            <div className="field"><label>Color</label><select value={color} onChange={(e) => setColor(e.target.value)}>{COLORS.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
