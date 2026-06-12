"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { clearMetaCache } from "@/lib/metadata";
import { apiNameFromLabel } from "@/lib/format";
import { Icon } from "@/lib/icons";
import { useToast } from "@/components/Toast";

const ICONS = ["Box", "Building2", "User", "TrendingUp", "CheckSquare", "Star", "Briefcase", "Database", "Tag", "Globe"];

export default function NewObjectPage() {
  const router = useRouter();
  const toast = useToast();
  const [label, setLabel] = useState("");
  const [plural, setPlural] = useState("");
  const [icon, setIcon] = useState("Box");
  const [recordTypes, setRecordTypes] = useState(false);
  const [addTab, setAddTab] = useState(true);
  const [saving, setSaving] = useState(false);

  const apiName = label ? `${apiNameFromLabel(label)}__c` : "";

  async function create() {
    if (!label || !plural) { toast("Label and plural label are required", "error"); return; }
    setSaving(true);
    try {
      // 1. Object
      const { data: obj, error } = await supabase.from("sf_objects").insert({
        api_name: apiName, label, plural_label: plural, icon, is_custom: true, enable_record_types: recordTypes,
      }).select().single();
      if (error) throw error;

      // 2. Default Name field
      await supabase.from("sf_fields").insert({
        object_id: obj.id, api_name: "Name", label: `${label} Name`, type: "text", required: true, is_custom: false, display_order: 1,
      });

      // 3. Default list view
      await supabase.from("sf_list_views").insert({
        object_id: obj.id, api_name: "All", label: `All ${plural}`, columns: ["Name"], is_default: true,
      });

      // 4. Object permission for all admin profiles
      const { data: profiles } = await supabase.from("sf_profiles").select("id,is_admin");
      for (const p of profiles || []) {
        await supabase.from("sf_object_permissions").insert({
          profile_id: p.id, object_id: obj.id,
          can_read: true, can_create: p.is_admin, can_edit: p.is_admin, can_delete: p.is_admin,
          view_all: p.is_admin, modify_all: p.is_admin,
        });
      }

      // 5. Optional tab + add to default app
      if (addTab) {
        const { data: tab } = await supabase.from("sf_tabs").insert({
          label: plural, type: "object", object_id: obj.id, icon,
        }).select().single();
        const { data: app } = await supabase.from("sf_apps").select("*").eq("is_default", true).maybeSingle();
        if (app && tab) {
          await supabase.from("sf_apps").update({ nav_items: [...(app.nav_items || []), tab.id] }).eq("id", app.id);
        }
      }

      clearMetaCache();
      toast(`${label} created`, "success");
      router.push(`/setup/object-manager/${apiName}`);
    } catch (e: any) {
      toast(e.message || "Failed to create object", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="flex items-center gap mb">
        <button className="btn-icon" onClick={() => router.back()}><Icon name="ArrowLeft" /></button>
        <h1>Create Custom Object</h1>
      </div>
      <div className="card">
        <div className="card-body">
          <div className="form-grid">
            <div className="field">
              <label>Label *</label>
              <input value={label} onChange={(e) => { setLabel(e.target.value); if (!plural || plural === label + "s") setPlural(e.target.value + "s"); }} placeholder="e.g. Project" />
            </div>
            <div className="field">
              <label>Plural Label *</label>
              <input value={plural} onChange={(e) => setPlural(e.target.value)} placeholder="e.g. Projects" />
            </div>
            <div className="field">
              <label>API Name</label>
              <input value={apiName} disabled />
            </div>
            <div className="field">
              <label>Icon</label>
              <select value={icon} onChange={(e) => setIcon(e.target.value)}>
                {ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div className="field field-full">
              <label className="flex items-center gap-sm"><input type="checkbox" style={{ width: "auto" }} checked={recordTypes} onChange={(e) => setRecordTypes(e.target.checked)} /> Enable Record Types</label>
            </div>
            <div className="field field-full">
              <label className="flex items-center gap-sm"><input type="checkbox" style={{ width: "auto" }} checked={addTab} onChange={(e) => setAddTab(e.target.checked)} /> Create a tab and add to the default app</label>
            </div>
          </div>
          <div className="flex gap mt" style={{ justifyContent: "flex-end" }}>
            <button className="btn" onClick={() => router.back()}>Cancel</button>
            <button className="btn btn-brand" onClick={create} disabled={saving}>{saving ? "Creating…" : "Create"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
