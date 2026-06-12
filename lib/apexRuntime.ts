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

// Load all active classes (type='class') so their `class Foo { static … }` definitions
// are in scope — this is what enables static methods + calling one class from another.
async function loadLibrary(): Promise<string> {
  const { data } = await supabase.from("sf_apex_classes").select("name, body").eq("type", "class").eq("active", true);
  // Only include classes that DECLARE a class/object (so calling Foo.method() works).
  // Procedural "script" classes are excluded so they don't execute as a side effect.
  return ((data as any[]) || [])
    .filter((c) => {
      // strip leading comments, then only include if it's a pure class/object declaration
      const stripped = String(c.body).replace(/^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*/, "");
      return /^\s*(?:class\s+\w+|(?:const|let|var)\s+\w+\s*=\s*\{)/.test(stripped);
    })
    .map((c) => `/* class ${c.name} */\n${c.body}`)
    .join("\n\n");
}

// Runs Apex-style code (JavaScript) with a Salesforce-flavored API surface.
// Real Apex is a different language; this is an honest substitute that mirrors the shape.
export async function runApex(
  body: string,
  ctx?: { trigger?: TriggerContext; withLibrary?: boolean }
): Promise<ApexResult> {
  const logs: string[] = [];
  const System = {
    debug: (...args: any[]) => logs.push("DEBUG|" + args.map(fmt).join(" ")),
    assert: (cond: any, msg?: string) => { if (!cond) throw new Error(msg || "System.assert failed"); },
    assertEquals: (a: any, b: any, msg?: string) => { if (a !== b) throw new Error(msg || `Expected ${fmt(a)} got ${fmt(b)}`); },
  };

  const query = async (soql: string) => (await runSoql(soql)).rows;

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

  // Database.executeBatch — Batchable pattern: { start, execute, finish }
  const Database = {
    query,
    executeBatch: async (handler: any, scopeSize = 200) => {
      logs.push("BATCH|start");
      const soql = typeof handler.start === "function" ? await handler.start() : handler.start;
      const records = soql ? await query(soql) : [];
      logs.push(`BATCH|${records.length} records, scope ${scopeSize}`);
      let processed = 0;
      for (let i = 0; i < records.length; i += scopeSize) {
        const chunk = records.slice(i, i + scopeSize);
        if (typeof handler.execute === "function") await handler.execute(chunk);
        processed += chunk.length;
        logs.push(`BATCH|executed scope ${Math.floor(i / scopeSize) + 1} (${processed}/${records.length})`);
      }
      if (typeof handler.finish === "function") await handler.finish();
      logs.push("BATCH|finish");
      return processed;
    },
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

  const preamble = ctx?.withLibrary !== false ? await loadLibrary() : "";

  const api = {
    System, query, Trigger, Database,
    insert: insertRecord, update: updateRecord,
    record: ctx?.trigger?.newRecords?.[0] || {},
  };

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(
      "ctx",
      `return (async () => { "use strict";
        const {System, query, Trigger, Database, insert, update, record} = ctx;
        ${preamble}
        ${body}
      })()`
    );
    const result = await fn(api);
    if (result !== undefined) logs.push("RESULT|" + fmt(result));
    return { logs, result };
  } catch (e: any) {
    logs.push("FATAL|" + e.message);
    return { logs, error: e.message };
  }
}

// Persist an execution log so it shows in the Developer Console → Logs tab.
export async function saveDebugLog(entry: {
  source: string; kind: string; logs: string[]; status?: string; objectApi?: string; recordId?: string;
}) {
  try {
    await supabase.from("sf_debug_logs").insert({
      source: entry.source, kind: entry.kind, logs: entry.logs,
      status: entry.status || "success", object_api: entry.objectApi || null, record_id: entry.recordId || null,
    });
  } catch { /* logging must never throw */ }
}
