"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Icon } from "@/lib/icons";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import type { SfProfile } from "@/lib/types";

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<SfProfile[]>([]);
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const toast = useToast();

  async function reload() {
    const { data } = await supabase.from("sf_profiles").select("*").order("name");
    setProfiles((data as SfProfile[]) || []);
  }
  useEffect(() => { reload(); }, []);

  async function create() {
    if (!name) return;
    const { data: obj } = await supabase.from("sf_profiles").insert({ name, description: desc, is_admin: false }).select().single();
    // seed read perms for all objects
    const { data: objs } = await supabase.from("sf_objects").select("id");
    for (const o of objs || []) {
      await supabase.from("sf_object_permissions").insert({ profile_id: obj.id, object_id: o.id, can_read: true });
    }
    setShow(false); setName(""); setDesc("");
    toast("Profile created", "success");
    reload();
  }

  return (
    <div>
      <div className="flex items-center mb" style={{ justifyContent: "space-between" }}>
        <div><h1>Profiles</h1><p className="muted">{profiles.length} profiles</p></div>
        <button className="btn btn-brand" onClick={() => setShow(true)}><Icon name="Plus" size={14} /> New Profile</button>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Description</th><th>Admin</th></tr></thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id}>
                <td><Link href={`/setup/profiles/${p.id}`}>{p.name}</Link></td>
                <td className="muted">{p.description}</td>
                <td>{p.is_admin ? <span className="badge" style={{ color: "var(--sf-green)" }}>Admin</span> : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {show && (
        <Modal title="New Profile" onClose={() => setShow(false)} footer={<><button className="btn" onClick={() => setShow(false)}>Cancel</button><button className="btn btn-brand" onClick={create}>Save</button></>}>
          <div className="field mb"><label>Profile Name *</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="field"><label>Description</label><input value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
        </Modal>
      )}
    </div>
  );
}
