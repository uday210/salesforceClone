"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getObjects, getFields } from "@/lib/metadata";
import { Icon } from "@/lib/icons";
import { useToast } from "./Toast";
import type { SfObject, SfField, SfFieldPermission } from "@/lib/types";

export default function FieldLevelSecurity({ profileId, permissionSetId }: { profileId?: string; permissionSetId?: string }) {
  const toast = useToast();
  const [objects, setObjects] = useState<SfObject[]>([]);
  const [objectId, setObjectId] = useState("");
  const [fields, setFields] = useState<SfField[]>([]);
  const [perms, setPerms] = useState<Record<string, { id?: string; readable: boolean; editable: boolean }>>({});

  useEffect(() => {
    getObjects().then((o) => { setObjects(o); if (o[0]) setObjectId(o[0].id); });
  }, []);

  useEffect(() => {
    if (!objectId) return;
    (async () => {
      const f = await getFields(objectId);
      setFields(f);
      const col = profileId ? "profile_id" : "permission_set_id";
      const val = profileId || permissionSetId;
      const { data } = await supabase.from("sf_field_permissions").select("*").eq(col, val);
      const existing = (data as SfFieldPermission[]) || [];
      const map: Record<string, { id?: string; readable: boolean; editable: boolean }> = {};
      for (const fld of f) {
        const ex = existing.find((x) => x.field_id === fld.id);
        map[fld.id] = ex ? { id: ex.id, readable: ex.readable, editable: ex.editable } : { readable: true, editable: true };
      }
      setPerms(map);
    })();
  }, [objectId, profileId, permissionSetId]);

  function toggle(fieldId: string, key: "readable" | "editable") {
    setPerms((p) => {
      const cur = { ...p[fieldId], [key]: !p[fieldId][key] };
      // if not readable, can't be editable
      if (key === "readable" && !cur.readable) cur.editable = false;
      if (key === "editable" && cur.editable) cur.readable = true;
      return { ...p, [fieldId]: cur };
    });
  }

  async function save() {
    for (const fieldId of Object.keys(perms)) {
      const perm = perms[fieldId];
      const payload: any = { field_id: fieldId, readable: perm.readable, editable: perm.editable };
      if (profileId) payload.profile_id = profileId; else payload.permission_set_id = permissionSetId;
      if (perm.id) await supabase.from("sf_field_permissions").update(payload).eq("id", perm.id);
      else await supabase.from("sf_field_permissions").insert(payload);
    }
    toast("Field permissions saved", "success");
  }

  return (
    <div className="card">
      <div className="card-header">
        <Icon name="Shield" size={16} /><h3>Field-Level Security</h3>
        <select className="ml-auto" style={{ width: "auto" }} value={objectId} onChange={(e) => setObjectId(e.target.value)}>
          {objects.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
        <button className="btn btn-brand btn-sm" onClick={save}><Icon name="Save" size={12} /> Save</button>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Field</th><th style={{ textAlign: "center" }}>Readable</th><th style={{ textAlign: "center" }}>Editable</th></tr></thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.id}>
                <td>{f.label} <span className="muted">{f.api_name}</span></td>
                <td style={{ textAlign: "center" }}><input type="checkbox" style={{ width: "auto" }} checked={!!perms[f.id]?.readable} onChange={() => toggle(f.id, "readable")} /></td>
                <td style={{ textAlign: "center" }}><input type="checkbox" style={{ width: "auto" }} checked={!!perms[f.id]?.editable} onChange={() => toggle(f.id, "editable")} disabled={["formula", "autonumber"].includes(f.type)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
