import { supabase } from "./supabaseClient";
import type { SfRecord, SfField } from "./types";
import { deriveRecordName } from "./format";

export async function listRecords(objectId: string, opts?: { limit?: number }): Promise<SfRecord[]> {
  let q = supabase
    .from("sf_records")
    .select("*")
    .eq("object_id", objectId)
    .order("created_at", { ascending: false });
  if (opts?.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data as SfRecord[]) || [];
}

export async function getRecord(id: string): Promise<SfRecord | null> {
  const { data, error } = await supabase.from("sf_records").select("*").eq("id", id).single();
  if (error) return null;
  return data as SfRecord;
}

export async function getRecordsByIds(ids: string[]): Promise<Record<string, SfRecord>> {
  if (!ids.length) return {};
  const { data, error } = await supabase.from("sf_records").select("*").in("id", ids);
  if (error) throw error;
  return Object.fromEntries(((data as SfRecord[]) || []).map((r) => [r.id, r]));
}

// Records that reference a given record via a lookup field (for related lists)
export async function getChildRecords(childObjectId: string, lookupField: string, parentId: string): Promise<SfRecord[]> {
  const { data, error } = await supabase
    .from("sf_records")
    .select("*")
    .eq("object_id", childObjectId)
    .eq(`data->>${lookupField}`, parentId);
  if (error) throw error;
  return (data as SfRecord[]) || [];
}

export async function createRecord(objectApi: string, objectId: string, data: Record<string, any>, recordTypeId?: string | null): Promise<SfRecord> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id || null;
  const name = deriveRecordName(objectApi, data);
  const { data: rec, error } = await supabase
    .from("sf_records")
    .insert({ object_id: objectId, record_type_id: recordTypeId || null, owner_id: uid, created_by: uid, name, data })
    .select()
    .single();
  if (error) throw error;
  return rec as SfRecord;
}

export async function updateRecord(objectApi: string, id: string, data: Record<string, any>): Promise<SfRecord> {
  const name = deriveRecordName(objectApi, data);
  const { data: rec, error } = await supabase
    .from("sf_records")
    .update({ name, data })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rec as SfRecord;
}

export async function deleteRecord(id: string): Promise<void> {
  const { error } = await supabase.from("sf_records").delete().eq("id", id);
  if (error) throw error;
}

// Coerce form input strings to the right JS types for storage
export function coerceFieldValue(field: SfField, raw: any): any {
  if (raw === "" || raw === undefined || raw === null) return null;
  switch (field.type) {
    case "number":
    case "currency":
    case "percent":
      return Number(raw);
    case "checkbox":
      return raw === true || raw === "true" || raw === "on";
    case "multipicklist":
      return Array.isArray(raw) ? raw : String(raw).split(";").map((s) => s.trim()).filter(Boolean);
    default:
      return raw;
  }
}
