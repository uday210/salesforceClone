import type { Condition, SfValidationRule } from "./types";

// Evaluate a condition tree against a record's data.
// Returns TRUE when the condition matches (in validation rules, TRUE => error fires).
export function evalCondition(cond: Condition, data: Record<string, any>): boolean {
  if (!cond || !("op" in cond)) return false;
  switch (cond.op) {
    case "and":
      return cond.args.every((c) => evalCondition(c, data));
    case "or":
      return cond.args.some((c) => evalCondition(c, data));
    case "not":
      return !evalCondition(cond.arg, data);
    case "blank": {
      const v = data[cond.field];
      return v === null || v === undefined || v === "";
    }
    case "notblank": {
      const v = data[cond.field];
      return !(v === null || v === undefined || v === "");
    }
    case "eq":
      return data[cond.field] == cond.value;
    case "ne":
      return data[cond.field] != cond.value;
    case "lt":
      return Number(data[cond.field]) < Number(cond.value);
    case "lte":
      return Number(data[cond.field]) <= Number(cond.value);
    case "gt":
      return Number(data[cond.field]) > Number(cond.value);
    case "gte":
      return Number(data[cond.field]) >= Number(cond.value);
    case "in":
      return cond.value.includes(data[cond.field]);
    case "nin":
      return !cond.value.includes(data[cond.field]);
    case "contains":
      return String(data[cond.field] ?? "").toLowerCase().includes(String(cond.value).toLowerCase());
    default:
      return false;
  }
}

export interface ValidationError {
  rule: string;
  message: string;
  location: string;
}

export function runValidationRules(
  rules: SfValidationRule[],
  data: Record<string, any>
): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const rule of rules) {
    if (!rule.active) continue;
    try {
      if (evalCondition(rule.condition, data)) {
        errors.push({ rule: rule.name, message: rule.error_message, location: rule.error_location });
      }
    } catch {
      // a malformed rule should never block saving
    }
  }
  return errors;
}

// A friendly human-readable summary of a condition (for the rule list UI)
export function describeCondition(cond: Condition): string {
  if (!cond || !("op" in cond)) return "—";
  switch (cond.op) {
    case "and":
      return cond.args.map(describeCondition).join(" AND ");
    case "or":
      return cond.args.map(describeCondition).join(" OR ");
    case "not":
      return `NOT(${describeCondition(cond.arg)})`;
    case "blank":
      return `ISBLANK(${cond.field})`;
    case "notblank":
      return `NOT ISBLANK(${cond.field})`;
    case "in":
      return `${cond.field} IN (${cond.value.join(", ")})`;
    case "nin":
      return `${cond.field} NOT IN (${cond.value.join(", ")})`;
    case "contains":
      return `${cond.field} CONTAINS "${cond.value}"`;
    default:
      return `${(cond as any).field} ${cond.op} ${(cond as any).value}`;
  }
}
