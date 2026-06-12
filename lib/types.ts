// ============================================================
// Metadata + record type definitions for the platform
// ============================================================

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "currency"
  | "percent"
  | "checkbox"
  | "date"
  | "datetime"
  | "email"
  | "phone"
  | "url"
  | "picklist"
  | "multipicklist"
  | "lookup"
  | "formula"
  | "autonumber";

export interface PicklistValue {
  value: string;
  label: string;
  color?: string;
}

export interface SfObject {
  id: string;
  api_name: string;
  label: string;
  plural_label: string;
  description: string | null;
  icon: string;
  is_custom: boolean;
  enable_record_types: boolean;
  enable_activities: boolean;
  created_at: string;
  updated_at: string;
}

export interface SfField {
  id: string;
  object_id: string;
  api_name: string;
  label: string;
  type: FieldType;
  required: boolean;
  is_unique: boolean;
  is_custom: boolean;
  default_value: string | null;
  help_text: string | null;
  picklist_values: PicklistValue[];
  reference_object_id: string | null;
  formula: string | null;
  length: number | null;
  precision: number | null;
  scale: number | null;
  display_order: number;
}

export interface SfRecordType {
  id: string;
  object_id: string;
  api_name: string;
  label: string;
  description: string | null;
  is_default: boolean;
  active: boolean;
}

export interface SfRecord {
  id: string;
  object_id: string;
  record_type_id: string | null;
  owner_id: string | null;
  name: string | null;
  data: Record<string, any>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SfListView {
  id: string;
  object_id: string;
  api_name: string;
  label: string;
  columns: string[];
  filters: { field: string; op: string; value: any }[];
  sort: { field?: string; dir?: "asc" | "desc" };
  is_default: boolean;
}

// Validation rule condition tree (evaluated client-side)
export type Condition =
  | { op: "and" | "or"; args: Condition[] }
  | { op: "not"; arg: Condition }
  | { op: "eq" | "ne" | "lt" | "lte" | "gt" | "gte"; field: string; value: any }
  | { op: "in" | "nin"; field: string; value: any[] }
  | { op: "contains"; field: string; value: string }
  | { op: "blank" | "notblank"; field: string };

export interface SfValidationRule {
  id: string;
  object_id: string;
  name: string;
  description: string | null;
  condition: Condition;
  error_message: string;
  error_location: string;
  active: boolean;
}

export interface LayoutSection {
  title: string;
  columns: 1 | 2;
  fields: (string | null)[];
}

export interface SfPageLayout {
  id: string;
  object_id: string;
  record_type_id: string | null;
  name: string;
  sections: LayoutSection[];
  related_lists: { object_api: string; field_api: string; columns: string[] }[];
  is_default: boolean;
}

export interface PageComponent {
  id: string;
  type: string; // record_detail | related_list | highlights | rich_text | report_chart | field_section | lwc | list_view
  props: Record<string, any>;
}

export interface SfLightningPage {
  id: string;
  name: string;
  type: "record" | "app" | "home";
  object_id: string | null;
  regions: { main: PageComponent[]; sidebar: PageComponent[] };
  is_default: boolean;
  active: boolean;
}

export interface SfTab {
  id: string;
  label: string;
  type: "object" | "lightning_page" | "vf_page" | "vf" | "lwc" | "web";
  object_id: string | null;
  lightning_page_id: string | null;
  url: string | null;
  icon: string;
}

export interface SfApp {
  id: string;
  api_name: string;
  label: string;
  description: string | null;
  icon: string;
  color: string;
  nav_items: string[]; // tab ids
  is_default: boolean;
}

export interface SfProfile {
  id: string;
  name: string;
  description: string | null;
  is_admin: boolean;
}

export interface SfPermissionSet {
  id: string;
  name: string;
  label: string;
  description: string | null;
}

export interface SfObjectPermission {
  id: string;
  profile_id: string | null;
  permission_set_id: string | null;
  object_id: string;
  can_read: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  view_all: boolean;
  modify_all: boolean;
}

export interface SfFieldPermission {
  id: string;
  profile_id: string | null;
  permission_set_id: string | null;
  field_id: string;
  readable: boolean;
  editable: boolean;
}

export interface SfUserAssignment {
  user_id: string;
  profile_id: string | null;
  permission_set_ids: string[];
  full_name: string | null;
  is_active: boolean;
}

export interface FlowNode {
  id: string;
  type: "start" | "decision" | "assignment" | "create" | "update" | "action" | "end";
  label?: string;
  props: Record<string, any>;
  x: number;
  y: number;
}

export interface SfFlow {
  id: string;
  api_name: string;
  label: string;
  description: string | null;
  type: string;
  trigger_object_id: string | null;
  trigger_event: string;
  definition: { nodes: FlowNode[]; edges: { from: string; to: string; label?: string }[] };
  active: boolean;
}

export interface SfApexClass {
  id: string;
  name: string;
  type: "class" | "trigger";
  body: string;
  trigger_object_id: string | null;
  trigger_events: string[];
  active: boolean;
  api_version: string;
}

export interface SfLwcComponent {
  id: string;
  name: string;
  label: string | null;
  html: string;
  js: string;
  css: string;
  targets: string[];
}

export interface SfVfPage {
  id: string;
  name: string;
  label: string | null;
  markup: string;
  controller: string | null;
}

export interface SfCustomLabel {
  id: string;
  name: string;
  value: string;
  category: string | null;
  language: string;
}

export interface SfCustomSetting {
  id: string;
  api_name: string;
  label: string;
  type: "hierarchy" | "list";
  fields: { api_name: string; label: string; type: FieldType }[];
  data: Record<string, any>;
}
