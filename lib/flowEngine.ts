import { supabase } from "./supabaseClient";
import type { SfFlow, FlowNode, SfApexClass } from "./types";
import { evalCondition } from "./validation";

export interface AutomationLogEntry {
  source: string;
  node?: string;
  message: string;
}

// Runs record-triggered flows + apex triggers for a given object + event.
// Simplified interpreter — supports decision, assignment, update, create, action(log) nodes.
export async function runAutomation(
  objectId: string,
  event: string, // after_create | after_update | ...
  record: { id: string; data: Record<string, any> }
): Promise<AutomationLogEntry[]> {
  const log: AutomationLogEntry[] = [];

  // ---- Flows ----
  const { data: flows } = await supabase
    .from("sf_flows")
    .select("*")
    .eq("trigger_object_id", objectId)
    .eq("trigger_event", event)
    .eq("active", true);

  for (const flow of (flows as SfFlow[]) || []) {
    try {
      await runFlow(flow, record, log);
    } catch (e: any) {
      log.push({ source: flow.label, message: `Error: ${e.message}` });
    }
  }

  // ---- Apex-style triggers ----
  // Map the app event (create/update/delete) to the Salesforce DML operation (insert/update/delete)
  // so a trigger registered for "before insert" fires when a record is created, etc.
  const op = event.includes("create") ? "insert" : event.includes("update") ? "update" : event.includes("delete") ? "delete" : event;
  const timing = event.includes("before") ? "before" : "after";
  const apexEvent = `${timing} ${op}`; // e.g. "after insert"
  const { data: triggers } = await supabase
    .from("sf_apex_classes")
    .select("*")
    .eq("type", "trigger")
    .eq("trigger_object_id", objectId)
    .eq("active", true);

  for (const trg of (triggers as SfApexClass[]) || []) {
    const events = (trg.trigger_events || []).map((e) => e.toLowerCase());
    // match on the operation keyword (insert/update/delete) — timing (before/after) is informational here
    if (!events.some((e) => e.includes(op))) continue;
    try {
      const { runApex, saveDebugLog } = await import("./apexRuntime");
      const res = await runApex(trg.body, { trigger: { newRecords: [record.data], event: apexEvent } });
      res.logs.forEach((l) => log.push({ source: trg.name, message: l }));
      // persist any in-place mutations the trigger made to record.data
      await supabase.from("sf_records").update({ data: record.data }).eq("id", record.id);
      // capture the debug log so it shows in the Developer Console → Logs
      await saveDebugLog({
        source: trg.name, kind: "trigger", logs: res.logs,
        status: res.error ? "error" : "success", recordId: record.id,
      });
    } catch (e: any) {
      log.push({ source: trg.name, message: `Apex error: ${e.message}` });
    }
  }

  return log;
}

async function runFlow(flow: SfFlow, record: { id: string; data: Record<string, any> }, log: AutomationLogEntry[]) {
  const { nodes, edges } = flow.definition;
  const start = nodes.find((n) => n.type === "start") || nodes[0];
  if (!start) return;

  let current: FlowNode | undefined = start;
  let guard = 0;
  const working = { ...record.data };
  const vars: Record<string, any[]> = {};
  let mutated = false;

  while (current && guard++ < 100) {
    const node: FlowNode = current;
    switch (node.type) {
      case "get_records": {
        if (node.props.object_id) {
          let q = supabase.from("sf_records").select("*").eq("object_id", node.props.object_id).limit(node.props.limit || 200);
          const { data } = await q;
          let rows = ((data as any[]) || []).map((r) => ({ Id: r.id, Name: r.name, ...r.data }));
          if (node.props.filterField && node.props.filterValue !== undefined && node.props.filterValue !== "") {
            rows = rows.filter((r) => String(r[node.props.filterField] ?? "") === String(node.props.filterValue));
          }
          vars[node.props.store_as || "records"] = rows;
          log.push({ source: flow.label, node: node.label || "Get Records", message: `Retrieved ${rows.length} record(s) into ${node.props.store_as || "records"}` });
        }
        break;
      }
      case "loop": {
        const coll = vars[node.props.collection] || [];
        const assigns: { field: string; value: any }[] = node.props.assignments || [];
        let count = 0;
        for (const item of coll) {
          if (assigns.length && item.Id) {
            const newData: Record<string, any> = { ...item };
            delete newData.Id; delete newData.Name;
            for (const a of assigns) newData[a.field] = a.value;
            await supabase.from("sf_records").update({ data: newData }).eq("id", item.Id);
            count++;
          }
        }
        log.push({ source: flow.label, node: node.label || "Loop", message: `Looped ${coll.length} item(s)${count ? `, updated ${count}` : ""}` });
        break;
      }
      case "screen": {
        log.push({ source: flow.label, node: node.label || "Screen", message: "Screen element (interactive — not shown in record-triggered runs)" });
        break;
      }
      case "assignment":
      case "update": {
        const assigns: { field: string; value: any }[] = node.props.assignments || [];
        for (const a of assigns) {
          working[a.field] = a.value;
          mutated = true;
        }
        log.push({ source: flow.label, node: node.label || node.type, message: `Set ${assigns.map((a) => a.field).join(", ")}` });
        break;
      }
      case "action": {
        log.push({ source: flow.label, node: node.label || "Action", message: node.props.message || "Action executed" });
        break;
      }
      case "create": {
        if (node.props.object_id) {
          await supabase.from("sf_records").insert({
            object_id: node.props.object_id,
            data: node.props.values || {},
            name: node.props.name || "Flow-created record",
          });
          log.push({ source: flow.label, node: node.label || "Create", message: "Created a record" });
        }
        break;
      }
    }

    // Decisions: pick the outgoing edge whose condition passes
    if (node.type === "decision") {
      const outs = edges.filter((e) => e.from === node.id);
      let chosen = outs.find((e) => {
        const branch = node.props.branches?.[e.label || ""];
        return branch ? evalCondition(branch, working) : false;
      });
      if (!chosen) chosen = outs.find((e) => e.label === "default") || outs[0];
      current = chosen ? nodes.find((n) => n.id === chosen!.to) : undefined;
      continue;
    }

    const out = edges.find((e) => e.from === node.id);
    current = out ? nodes.find((n) => n.id === out.to) : undefined;
    if (node.type === "end") break;
  }

  if (mutated) {
    await supabase.from("sf_records").update({ data: working }).eq("id", record.id);
  }

  await supabase.from("sf_flow_runs").insert({
    flow_id: flow.id,
    record_id: record.id,
    status: "success",
    log: log.filter((l) => l.source === flow.label),
  });
}

