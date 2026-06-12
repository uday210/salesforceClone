// Minimal Salesforce-style formula evaluator.
// Supports field references (by api_name), arithmetic, string concat with &,
// comparisons, and common functions. Not the real formula engine — a practical subset.

const HELPERS: Record<string, any> = {
  IF: (c: any, a: any, b: any) => (c ? a : b),
  AND: (...a: any[]) => a.every(Boolean),
  OR: (...a: any[]) => a.some(Boolean),
  NOT: (x: any) => !x,
  ISBLANK: (x: any) => x === null || x === undefined || x === "",
  ISNULL: (x: any) => x === null || x === undefined,
  TEXT: (x: any) => (x === null || x === undefined ? "" : String(x)),
  VALUE: (x: any) => Number(x),
  LEN: (s: any) => String(s ?? "").length,
  UPPER: (s: any) => String(s ?? "").toUpperCase(),
  LOWER: (s: any) => String(s ?? "").toLowerCase(),
  LEFT: (s: any, n: number) => String(s ?? "").slice(0, n),
  RIGHT: (s: any, n: number) => String(s ?? "").slice(-n),
  TRIM: (s: any) => String(s ?? "").trim(),
  CONTAINS: (s: any, sub: any) => String(s ?? "").includes(String(sub)),
  BEGINS: (s: any, sub: any) => String(s ?? "").startsWith(String(sub)),
  ROUND: (x: any, n = 0) => Math.round(Number(x) * 10 ** n) / 10 ** n,
  ABS: (x: any) => Math.abs(Number(x)),
  MAX: (...a: any[]) => Math.max(...a.map(Number)),
  MIN: (...a: any[]) => Math.min(...a.map(Number)),
  FLOOR: (x: any) => Math.floor(Number(x)),
  CEILING: (x: any) => Math.ceil(Number(x)),
  MOD: (a: any, b: any) => Number(a) % Number(b),
  TODAY: () => new Date().toISOString().slice(0, 10),
  NOW: () => new Date().toISOString(),
  BLANKVALUE: (x: any, alt: any) => (x === null || x === undefined || x === "" ? alt : x),
  CASESAFEID: (x: any) => x,
};

export function evalFormula(formula: string, data: Record<string, any>): any {
  if (!formula) return "";
  try {
    const ctx = { ...HELPERS, ...data };
    // string concatenation operator & -> +  (avoid touching && )
    const js = formula.replace(/&&/g, "__AND__").replace(/&/g, "+").replace(/__AND__/g, "&&");
    // eslint-disable-next-line no-new-func
    const fn = new Function("ctx", `with(ctx){ return (${js}); }`);
    return fn(ctx);
  } catch (e: any) {
    return `#ERROR: ${e.message}`;
  }
}

export function formatFormulaResult(v: any): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "✓" : "—";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(2);
  return String(v);
}
