import { supabase } from "./supabaseClient";
import { getObjectByApi, getFields } from "./metadata";

export interface SoqlResult {
  columns: string[];
  rows: Record<string, any>[];
  totalSize: number;
  object: string;
}

// Parse + execute a practical subset of SOQL against the metadata record store.
// Supports: SELECT f1,f2 FROM Object [WHERE cond [AND|OR cond]] [ORDER BY field [ASC|DESC]] [LIMIT n]
export async function runSoql(query: string): Promise<SoqlResult> {
  const q = query.trim().replace(/;+\s*$/, "");
  const m = q.match(/^select\s+(.+?)\s+from\s+(\w+)(?:\s+where\s+(.+?))?(?:\s+order\s+by\s+(\w+)(?:\s+(asc|desc))?)?(?:\s+limit\s+(\d+))?$/is);
  if (!m) throw new Error("Could not parse SOQL. Expected: SELECT fields FROM Object [WHERE …] [ORDER BY …] [LIMIT n]");

  const [, selectRaw, objApi, whereRaw, orderField, orderDir, limitRaw] = m;
  const obj = await getObjectByApi(objApi);
  if (!obj) throw new Error(`sObject type '${objApi}' is not supported.`);

  const fields = await getFields(obj.id);
  const validApis = new Set(["Id", "Name", "CreatedDate", ...fields.map((f) => f.api_name)]);

  const selectFields = selectRaw.trim() === "*"
    ? ["Id", "Name", ...fields.map((f) => f.api_name)]
    : selectRaw.split(",").map((s) => s.trim());

  for (const f of selectFields) {
    if (!validApis.has(f)) throw new Error(`No such column '${f}' on entity '${objApi}'.`);
  }

  const { data, error } = await supabase.from("sf_records").select("*").eq("object_id", obj.id);
  if (error) throw error;

  let rows = (data || []).map((r: any) => ({ Id: r.id, Name: r.name, CreatedDate: r.created_at, ...r.data }));

  if (whereRaw) {
    const conds = parseWhere(whereRaw);
    rows = rows.filter((row) => evalWhere(conds, row));
  }
  if (orderField) {
    const dir = (orderDir || "asc").toLowerCase() === "desc" ? -1 : 1;
    rows.sort((a, b) => {
      const av = a[orderField], bv = b[orderField];
      if (av == null) return 1; if (bv == null) return -1;
      return (av > bv ? 1 : av < bv ? -1 : 0) * dir;
    });
  }
  const totalSize = rows.length;
  if (limitRaw) rows = rows.slice(0, Number(limitRaw));

  const projected = rows.map((row) => Object.fromEntries(selectFields.map((f) => [f, row[f] ?? null])));
  return { columns: selectFields, rows: projected, totalSize, object: obj.api_name };
}

interface WhereCond { field: string; op: string; value: any; join: "AND" | "OR"; }

function parseWhere(raw: string): WhereCond[] {
  const parts = raw.split(/\s+(AND|OR)\s+/i);
  const conds: WhereCond[] = [];
  let join: "AND" | "OR" = "AND";
  for (let i = 0; i < parts.length; i++) {
    const tok = parts[i];
    if (/^(AND|OR)$/i.test(tok)) { join = tok.toUpperCase() as any; continue; }
    const cm = tok.trim().match(/^(\w+)\s*(=|!=|<>|>=|<=|>|<|like)\s*(.+)$/i);
    if (!cm) continue;
    let val: any = cm[3].trim();
    if (/^'.*'$/.test(val)) val = val.slice(1, -1);
    else if (!isNaN(Number(val))) val = Number(val);
    else if (val.toLowerCase() === "true") val = true;
    else if (val.toLowerCase() === "false") val = false;
    else if (val.toLowerCase() === "null") val = null;
    conds.push({ field: cm[1], op: cm[2].toLowerCase(), value: val, join: conds.length === 0 ? "AND" : join });
  }
  return conds;
}

function one(c: WhereCond, row: Record<string, any>): boolean {
  const v = row[c.field];
  switch (c.op) {
    case "=": return v == c.value;
    case "!=": case "<>": return v != c.value;
    case ">": return Number(v) > Number(c.value);
    case "<": return Number(v) < Number(c.value);
    case ">=": return Number(v) >= Number(c.value);
    case "<=": return Number(v) <= Number(c.value);
    case "like": return String(v ?? "").toLowerCase().includes(String(c.value).replace(/%/g, "").toLowerCase());
    default: return false;
  }
}

function evalWhere(conds: WhereCond[], row: Record<string, any>): boolean {
  if (!conds.length) return true;
  let result = one(conds[0], row);
  for (let i = 1; i < conds.length; i++) {
    result = conds[i].join === "OR" ? result || one(conds[i], row) : result && one(conds[i], row);
  }
  return result;
}
