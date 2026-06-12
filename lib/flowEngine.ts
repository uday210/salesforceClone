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
  const apexEvent = event.replace("_", " "); // after_create -> "after create" (we match loosely)
  const { data: triggers } = await supabase
    .from("sf_apex_classes")
    .select("*")
    .eq("type", "trigger")
    .eq("trigger_object_id", objectId)
    .eq("active", true);

  for (const trg of (triggers as SfApexClass[]) || []) {
    const events = (trg.trigger_events || []).map((e) => e.toLowerCase());
    if (!events.some((e) => e.includes(event.split("_")[0]) || e === apexEvent)) continue;
    try {
      runApexTrigger(trg, record, log);
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
  let mutated = false;

  while (current && guard++ < 50) {
    const node: FlowNode = current;
    switch (node.type) {
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

// Execute an apex-style trigger. The body is JS with access to a small API.
function runApexTrigger(trg: SfApexClass, record: { id: string; data: Record<string, any> }, log: AutomationLogEntry[]) {
  const api = {
    record: record.data,
    log: (msg: string) => log.push({ source: trg.name, message: String(msg) }),
    System: { debug: (msg: any) => log.push({ source: trg.name, message: String(msg) }) },
  };
  // eslint-disable-next-line no-new-func
  const fn = new Function("ctx", `"use strict"; const {record, log, System} = ctx; ${trg.body}`);
  fn(api);
}
