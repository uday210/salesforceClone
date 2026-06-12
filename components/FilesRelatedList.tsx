"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Icon } from "@/lib/icons";
import { useToast } from "./Toast";

interface SfFile { id: string; name: string; path: string; url: string | null; mime: string | null; size: number | null; created_at: string; }

export default function FilesRelatedList({ recordId, objectId }: { recordId: string; objectId: string }) {
  const [files, setFiles] = useState<SfFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<SfFile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  async function load() {
    const { data } = await supabase.from("sf_files").select("*").eq("record_id", recordId).order("created_at", { ascending: false });
    setFiles((data as SfFile[]) || []);
  }
  useEffect(() => { load(); }, [recordId]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${recordId}/${Date.now()}_${safe}`;
      const { error: upErr } = await supabase.storage.from("sf-files").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("sf-files").getPublicUrl(path);
      const { data: userRes } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from("sf_files").insert({
        record_id: recordId, object_id: objectId, name: file.name, path,
        url: pub.publicUrl, mime: file.type, size: file.size, uploaded_by: userRes.user?.id || null,
      });
      if (insErr) throw insErr;
      toast("File uploaded", "success");
      load();
    } catch (err: any) {
      toast(err.message || "Upload failed", "error");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function del(f: SfFile) {
    if (!confirm(`Delete ${f.name}?`)) return;
    await supabase.storage.from("sf-files").remove([f.path]);
    await supabase.from("sf_files").delete().eq("id", f.id);
    toast("File deleted", "success");
    load();
  }

  function isImage(f: SfFile) { return (f.mime || "").startsWith("image/"); }
  function fmtSize(n: number | null) { if (!n) return ""; return n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`; }

  return (
    <div className="card mb">
      <div className="card-header">
        <Icon name="FileCode" size={16} /><h3>Files ({files.length})</h3>
        <button className="btn btn-sm ml-auto" onClick={() => inputRef.current?.click()} disabled={uploading}>
          <Icon name={uploading ? "Loader2" : "Plus"} size={12} /> {uploading ? "Uploading…" : "Upload File"}
        </button>
        <input ref={inputRef} type="file" hidden onChange={onPick} />
      </div>
      <div className="card-body">
        {!files.length ? (
          <div className="empty-state" style={{ padding: "1.5rem" }}>No files. Upload one to attach it to this record.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "0.75rem" }}>
            {files.map((f) => (
              <div key={f.id} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden", background: "#fff" }}>
                <div
                  style={{ height: 90, background: "#f3f3f3", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden" }}
                  onClick={() => (isImage(f) ? setPreview(f) : window.open(f.url || "#", "_blank"))}
                >
                  {isImage(f) && f.url
                    ? <img src={f.url} alt={f.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <Icon name="FileCode" size={32} />}
                </div>
                <div style={{ padding: "0.4rem 0.5rem" }}>
                  <div style={{ fontSize: "0.74rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={f.name}>{f.name}</div>
                  <div className="flex items-center" style={{ justifyContent: "space-between" }}>
                    <span className="muted" style={{ fontSize: "0.68rem" }}>{fmtSize(f.size)}</span>
                    <span className="flex gap-sm">
                      <a href={f.url || "#"} target="_blank" rel="noreferrer" className="btn-icon btn-sm"><Icon name="Eye" size={12} /></a>
                      <button className="btn-icon btn-sm" onClick={() => del(f)}><Icon name="Trash2" size={12} /></button>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {preview && (
        <div className="modal-overlay" onClick={() => setPreview(null)}>
          <div className="modal" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2>{preview.name}</h2><button className="btn-icon ml-auto" onClick={() => setPreview(null)}><Icon name="X" /></button></div>
            <div className="modal-body" style={{ textAlign: "center" }}>
              <img src={preview.url || ""} alt={preview.name} style={{ maxWidth: "100%", maxHeight: "60vh" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
