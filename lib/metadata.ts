import { supabase } from "./supabaseClient";
import type {
  SfObject, SfField, SfListView, SfValidationRule, SfRecordType,
  SfPageLayout, SfLightningPage, SfApp, SfTab,
} from "./types";

// Lightweight in-memory caches (per page load) to avoid refetching metadata.
let objectsCache: SfObject[] | null = null;

export async function getObjects(force = false): Promise<SfObject[]> {
  if (objectsCache && !force) return objectsCache;
  const { data, error } = await supabase.from("sf_objects").select("*").order("label");
  if (error) throw error;
  objectsCache = (data as SfObject[]) || [];
  return objectsCache;
}

export function clearMetaCache() {
  objectsCache = null;
}

export async function getObjectByApi(api: string): Promise<SfObject | null> {
  const objs = await getObjects();
  return objs.find((o) => o.api_name.toLowerCase() === api.toLowerCase()) || null;
}

export async function getObjectById(id: string): Promise<SfObject | null> {
  const objs = await getObjects();
  return objs.find((o) => o.id === id) || null;
}

export async function getFields(objectId: string): Promise<SfField[]> {
  const { data, error } = await supabase
    .from("sf_fields")
    .select("*")
    .eq("object_id", objectId)
    .order("display_order");
  if (error) throw error;
  return (data as SfField[]) || [];
}

export async function getListViews(objectId: string): Promise<SfListView[]> {
  const { data, error } = await supabase
    .from("sf_list_views")
    .select("*")
    .eq("object_id", objectId)
    .order("label");
  if (error) throw error;
  return (data as SfListView[]) || [];
}

export async function getValidationRules(objectId: string): Promise<SfValidationRule[]> {
  const { data, error } = await supabase
    .from("sf_validation_rules")
    .select("*")
    .eq("object_id", objectId);
  if (error) throw error;
  return (data as SfValidationRule[]) || [];
}

export async function getRecordTypes(objectId: string): Promise<SfRecordType[]> {
  const { data, error } = await supabase
    .from("sf_record_types")
    .select("*")
    .eq("object_id", objectId);
  if (error) throw error;
  return (data as SfRecordType[]) || [];
}

export async function getPageLayouts(objectId: string): Promise<SfPageLayout[]> {
  const { data, error } = await supabase
    .from("sf_page_layouts")
    .select("*")
    .eq("object_id", objectId);
  if (error) throw error;
  return (data as SfPageLayout[]) || [];
}

export async function getLightningPages(filter?: { type?: string; objectId?: string }): Promise<SfLightningPage[]> {
  let q = supabase.from("sf_lightning_pages").select("*");
  if (filter?.type) q = q.eq("type", filter.type);
  if (filter?.objectId) q = q.eq("object_id", filter.objectId);
  const { data, error } = await q.order("name");
  if (error) throw error;
  return (data as SfLightningPage[]) || [];
}

export async function getApps(): Promise<SfApp[]> {
  const { data, error } = await supabase.from("sf_apps").select("*").order("label");
  if (error) throw error;
  return (data as SfApp[]) || [];
}

export async function getTabs(): Promise<SfTab[]> {
  const { data, error } = await supabase.from("sf_tabs").select("*");
  if (error) throw error;
  return (data as SfTab[]) || [];
}

// Build a quick lookup: object id -> object (for resolving lookups / nav)
export async function objectIndex(): Promise<Record<string, SfObject>> {
  const objs = await getObjects();
  return Object.fromEntries(objs.map((o) => [o.id, o]));
}
