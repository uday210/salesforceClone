import { supabase } from "./supabaseClient";
import type { SfUserAssignment, SfProfile, SfObjectPermission } from "./types";

export interface CurrentUser {
  id: string;
  email: string;
  assignment: SfUserAssignment | null;
  profile: SfProfile | null;
}

let cache: CurrentUser | null = null;

export async function getCurrentUser(force = false): Promise<CurrentUser | null> {
  if (cache && !force) return cache;
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return null;

  const { data: assignment } = await supabase
    .from("sf_user_assignments")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  let profile: SfProfile | null = null;
  if (assignment?.profile_id) {
    const { data: p } = await supabase
      .from("sf_profiles")
      .select("*")
      .eq("id", assignment.profile_id)
      .maybeSingle();
    profile = (p as SfProfile) || null;
  }

  cache = {
    id: user.id,
    email: user.email || "",
    assignment: (assignment as SfUserAssignment) || null,
    profile,
  };
  return cache;
}

export function clearUserCache() {
  cache = null;
}

export interface ObjectAccess {
  read: boolean; create: boolean; edit: boolean; del: boolean;
}

// Resolve effective object permissions from the user's profile + permission sets.
export async function getObjectAccess(objectId: string): Promise<ObjectAccess> {
  const user = await getCurrentUser();
  if (!user) return { read: false, create: false, edit: false, del: false };
  if (user.profile?.is_admin) return { read: true, create: true, edit: true, del: true };

  const sources: string[] = [];
  if (user.assignment?.profile_id) sources.push(user.assignment.profile_id);

  const permSetIds = user.assignment?.permission_set_ids || [];

  const { data: profPerms } = await supabase
    .from("sf_object_permissions")
    .select("*")
    .eq("object_id", objectId);

  const perms = ((profPerms as SfObjectPermission[]) || []).filter(
    (p) =>
      (p.profile_id && sources.includes(p.profile_id)) ||
      (p.permission_set_id && permSetIds.includes(p.permission_set_id))
  );

  return {
    read: perms.some((p) => p.can_read),
    create: perms.some((p) => p.can_create),
    edit: perms.some((p) => p.can_edit),
    del: perms.some((p) => p.can_delete),
  };
}

export async function isAdmin(): Promise<boolean> {
  const u = await getCurrentUser();
  return !!u?.profile?.is_admin;
}

export async function signOut() {
  clearUserCache();
  await supabase.auth.signOut();
}
