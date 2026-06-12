import type { SfField } from "./types";

export function formatValue(field: SfField, value: any, lookupName?: string): string {
  if (value === null || value === undefined || value === "") return "—";
  switch (field.type) {
    case "currency":
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value));
    case "percent":
      return `${value}%`;
    case "number":
      return new Intl.NumberFormat("en-US").format(Number(value));
    case "checkbox":
      return value ? "✓" : "—";
    case "date":
      return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    case "datetime":
      return new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
    case "lookup":
      return lookupName || String(value);
    case "multipicklist":
      return Array.isArray(value) ? value.join("; ") : String(value);
    default:
      return String(value);
  }
}

export function initials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "");
}

// Derive the display name of a record from its object's "name" field convention
export function deriveRecordName(objectApi: string, data: Record<string, any>): string {
  if (data.Name) return String(data.Name);
  if (data.FirstName || data.LastName) return [data.FirstName, data.LastName].filter(Boolean).join(" ");
  if (data.Subject) return String(data.Subject);
  if (data.Company) return String(data.Company);
  return "Untitled";
}

export function apiNameFromLabel(label: string): string {
  return label.trim().replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "Custom";
}

// Salesforce-style per-object icon tile colors.
const OBJECT_COLORS: Record<string, string> = {
  Account: "#7f5fc9",
  Contact: "#5867e8",
  Lead: "#f2974a",
  Opportunity: "#fcb95b",
  Task: "#3ba755",
};
const PALETTE = ["#5867e8", "#7f5fc9", "#00a1e0", "#3ba755", "#f2974a", "#e9696e", "#16a5a5", "#d4504c"];

export function objectColor(apiName: string): string {
  if (OBJECT_COLORS[apiName]) return OBJECT_COLORS[apiName];
  let h = 0;
  for (let i = 0; i < apiName.length; i++) h = (h * 31 + apiName.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
