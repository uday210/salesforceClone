import { runSoql } from "./soql";
import { supabase } from "./supabaseClient";
import { getObjectByApi } from "./metadata";
import { deriveRecordName } from "./format";

export interface ApexResult { logs: string[]; result?: any; error?: string; }

export interface TriggerContext {
  newRecords?: Record<string, any>[];
  oldRecords?: Record<string, any>[];
  event?: string; // e.g. "after update"
}

function fmt(v: any): string {
  if (typeof v === "object") { try { return JSON.stringify(v); } catch { return String(v); } }
  return String(v);
}

// Runs Apex-style code (JavaScript) with a Salesforce-flavored API surface.
// Real Apex is a different language; this is an honest substitute that mirrors the shape.
export async function runApex(body: string, ctx?: { trigger?: TriggerContext }): Promise<ApexResult> {
  const logs: string[] = [];
  const System = {
    debug: (...args: any[]) => logs.push("DEBUG|" + args.map(fmt).join(" ")),
    assert: (cond: any, msg?: string) => { if (!cond) throw new Error(msg || "System.assert failed"); },
  };

  // SOQL: query(`SELECT ... FROM ...`) -> array of rows
  const query = async (soql: string) => (await runSoql(soql)).rows;

  // DML helpers operating on the generic record store
  const insertRecord = async (objApi: string, data: Record<string, any>) => {
    const obj = await getObjectByApi(objApi);
    if (!obj) throw new Error(`insert: unknown object ${objApi}`);
    const { data: rec, error } = await supabase.from("sf_records")
      .insert({ object_id: obj.id, name: deriveRecordName(objApi, data), data })
      .select().single();
    if (error) throw new Error(error.message);
    logs.push(`DML|inserted ${objApi} ${rec.id}`);
    return rec.id as string;
  };
  const updateRecord = async (id: string, data: Record<string, any>) => {
    const { error } = await supabase.from("sf_records").update({ data }).eq("id", id);
    if (error) throw new Error(error.message);
    logs.push(`DML|updated ${id}`);
  };

  const ev = ctx?.trigger?.event || "";
  const Trigger = ctx?.trigger
    ? {
        new: ctx.trigger.newRecords || [],
        old: ctx.trigger.oldRecords || [],
        isInsert: ev.includes("insert") || ev.includes("create"),
        isUpdate: ev.includes("update"),
        isDelete: ev.includes("delete"),
        isBefore: ev.includes("before"),
        isAfter: ev.includes("after"),
      }
    : undefined;

  const api = {
    System, query, Trigger,
    insert: insertRecord, update: updateRecord,
    record: ctx?.trigger?.newRecords?.[0] || {},
  };

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("ctx", `return (async () => { "use strict"; const {System, query, Trigger, insert, update, record} = ctx; ${body}\n })()`);
    const result = await fn(api);
    if (result !== undefined) logs.push("RESULT|" + fmt(result));
    return { logs, result };
  } catch (e: any) {
    logs.push("FATAL|" + e.message);
    return { logs, error: e.message };
  }
}
