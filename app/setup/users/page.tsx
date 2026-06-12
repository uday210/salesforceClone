"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Icon } from "@/lib/icons";
import { useToast } from "@/components/Toast";
import type { SfUserAssignment, SfProfile, SfPermissionSet } from "@/lib/types";

export default function UsersPage() {
  const [users, setUsers] = useState<SfUserAssignment[]>([]);
  const [profiles, setProfiles] = useState<SfProfile[]>([]);
  const [permSets, setPermSets] = useState<SfPermissionSet[]>([]);
  const toast = useToast();

  async function reload() {
    const [{ data: u }, { data: p }, { data: ps }] = await Promise.all([
      supabase.from("sf_user_assignments").select("*"),
      supabase.from("sf_profiles").select("*").order("name"),
      supabase.from("sf_permission_sets").select("*").order("label"),
    ]);
    setUsers((u as SfUserAssignment[]) || []);
    setProfiles((p as SfProfile[]) || []);
    setPermSets((ps as SfPermissionSet[]) || []);
  }
  useEffect(() => { reload(); }, []);

  async function setProfile(userId: string, profileId: string) {
    await supabase.from("sf_user_assignments").update({ profile_id: profileId }).eq("user_id", userId);
    toast("Profile updated", "success");
    reload();
  }
  async function togglePermSet(user: SfUserAssignment, psId: string) {
    const current = user.permission_set_ids || [];
    const next = current.includes(psId) ? current.filter((x) => x !== psId) : [...current, psId];
    await supabase.from("sf_user_assignments").update({ permission_set_ids: next }).eq("user_id", user.user_id);
    reload();
  }

  return (
    <div>
      <h1 className="mb">Users</h1>
      <p className="muted mb">Assign profiles and permission sets. Users self-register from the login screen.</p>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>User</th><th>Profile</th><th>Permission Sets</th><th>Active</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.user_id}>
                <td>{u.full_name || u.user_id.slice(0, 8)}</td>
                <td>
                  <select style={{ width: "auto" }} value={u.profile_id || ""} onChange={(e) => setProfile(u.user_id, e.target.value)}>
                    {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </td>
                <td>
                  <div className="flex gap-sm" style={{ flexWrap: "wrap" }}>
                    {permSets.map((ps) => (
                      <label key={ps.id} className="badge" style={{ cursor: "pointer" }}>
                        <input type="checkbox" style={{ width: "auto" }} checked={(u.permission_set_ids || []).includes(ps.id)} onChange={() => togglePermSet(u, ps.id)} /> {ps.label}
                      </label>
                    ))}
                    {!permSets.length && <span className="muted">—</span>}
                  </div>
                </td>
                <td>{u.is_active ? <Icon name="Check" size={14} color="var(--sf-green)" /> : ""}</td>
              </tr>
            ))}
            {!users.length && <tr><td colSpan={4} className="muted">No users yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
