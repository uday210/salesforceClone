"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getObjects } from "@/lib/metadata";
import { Icon } from "@/lib/icons";
import { useToast } from "@/components/Toast";
import type { SfProfile, SfObject, SfObjectPermission } from "@/lib/types";

const PERMS: { key: keyof SfObjectPermission; label: string }[] = [
  { key: "can_read", label: "Read" },
  { key: "can_create", label: "Create" },
  { key: "can_edit", label: "Edit" },
  { key: "can_delete", label: "Delete" },
  { key: "view_all", label: "View All" },
  { key: "modify_all", label: "Modify All" },
];

export default function ProfileDetailPage() {
  const id = String(useParams().id);
  const toast = useToast();
  const [profile, setProfile] = useState<SfProfile | null>(null);
  const [objects, setObjects] = useState<SfObject[]>([]);
  const [perms, setPerms] = useState<Record<string, SfObjectPermission>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("sf_profiles").select("*").eq("id", id).single();
      setProfile(p as SfProfile);
      const objs = await getObjects();
      setObjects(objs);
      const { data: op } = await supabase.from("sf_object_permissions").select("*").eq("profile_id", id);
      const map: Record<string, SfObjectPermission> = {};
      for (const o of objs) {
        const existing = (op as SfObjectPermission[] || []).find((x) => x.object_id === o.id);
        map[o.id] = existing || { id: "", profile_id: id, permission_set_id: null, object_id: o.id, can_read: false, can_create: false, can_edit: false, can_delete: false, view_all: false, modify_all: false };
      }
      setPerms(map);
    })();
  }, [id]);

  function toggle(objId: string, key: keyof SfObjectPermission) {
    setPerms((p) => ({ ...p, [objId]: { ...p[objId], [key]: !p[objId][key] } }));
  }

  async function save() {
    setSaving(true);
    for (const objId of Object.keys(perms)) {
      const perm = perms[objId];
      const payload = {
        profile_id: id, object_id: objId,
        can_read: perm.can_read, can_create: perm.can_create, can_edit: perm.can_edit,
        can_delete: perm.can_delete, view_all: perm.view_all, modify_all: perm.modify_all,
      };
      if (perm.id) await supabase.from("sf_object_permissions").update(payload).eq("id", perm.id);
      else await supabase.from("sf_object_permissions").insert(payload);
    }
    setSaving(false);
    toast("Permissions saved", "success");
  }

  if (!profile) return <div className="spinner" />;

  return (
    <div>
      <div className="flex items-center gap mb">
        <span className="record-icon" style={{ background: "var(--sf-purple)" }}><Icon name="Shield" size={18} /></span>
        <div><div className="eyebrow muted">Profile</div><h1>{profile.name}</h1></div>
        <button className="btn btn-brand ml-auto" onClick={save} disabled={saving || profile.is_admin}><Icon name="Save" size={14} /> Save</button>
      </div>
      {profile.is_admin && <p className="muted mb">System Administrator has full access to all objects (not editable).</p>}
      <div className="card">
        <div className="card-header"><Icon name="Database" size={16} /><h3>Object Permissions</h3></div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Object</th>{PERMS.map((p) => <th key={p.key} style={{ textAlign: "center" }}>{p.label}</th>)}</tr></thead>
            <tbody>
              {objects.map((o) => (
                <tr key={o.id}>
                  <td><Icon name={o.icon} size={13} /> {o.label}</td>
                  {PERMS.map((p) => (
                    <td key={p.key} style={{ textAlign: "center" }}>
                      <input type="checkbox" style={{ width: "auto" }} disabled={profile.is_admin}
                        checked={profile.is_admin ? true : !!perms[o.id]?.[p.key]}
                        onChange={() => toggle(o.id, p.key)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
