"use client";
import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/lib/icons";
import { runSoql, type SoqlResult } from "@/lib/soql";
import { runApex } from "@/lib/apexRuntime";

const SAMPLE_SOQL = "SELECT Name, Type, Industry, AnnualRevenue FROM Account WHERE AnnualRevenue > 1000000 ORDER BY AnnualRevenue DESC LIMIT 10";
const SAMPLE_APEX = `// Execute Anonymous — JavaScript with an Apex-flavored API.
const leads = await query("SELECT Name, Status FROM Lead");
System.debug('Total leads: ' + leads.length);
const hot = leads.filter(l => l.Status === 'Qualified');
System.debug('Qualified: ' + hot.length);`;

export default function DevConsole() {
  const [tab, setTab] = useState<"query" | "anon">("query");
  const [soql, setSoql] = useState(SAMPLE_SOQL);
  const [result, setResult] = useState<SoqlResult | null>(null);
  const [queryError, setQueryError] = useState("");
  const [running, setRunning] = useState(false);
  const [apex, setApex] = useState(SAMPLE_APEX);
  const [logs, setLogs] = useState<string[]>([]);

  async function execQuery() {
    setRunning(true); setQueryError(""); setResult(null);
    try { setResult(await runSoql(soql)); }
    catch (e: any) { setQueryError(e.message); }
    finally { setRunning(false); }
  }
  async function execApex() {
    setRunning(true); setLogs(["Running…"]);
    const res = await runApex(apex);
    setLogs(res.logs.length ? res.logs : ["(no output)"]);
    setRunning(false);
  }

  return (
    <div>
      <div className="flex items-center gap mb">
        <span className="record-icon" style={{ background: "#032d60" }}><Icon name="Code2" size={18} /></span>
        <div><div className="eyebrow muted">Developer Console</div><h1>Developer Console</h1></div>
        <Link href="/setup" className="btn ml-auto"><Icon name="ArrowLeft" size={14} /> Setup</Link>
      </div>

      <div className="nav-bar" style={{ background: "#fff", boxShadow: "none", border: "1px solid var(--sf-border)", borderBottom: "none", borderRadius: "0.5rem 0.5rem 0 0" }}>
        <a className={`nav-tab ${tab === "query" ? "active" : ""}`} style={{ color: tab === "query" ? "var(--sf-blue)" : "var(--sf-text-weak)", borderBottomColor: tab === "query" ? "var(--sf-blue)" : "transparent", cursor: "pointer" }} onClick={() => setTab("query")}>Query Editor</a>
        <a className={`nav-tab ${tab === "anon" ? "active" : ""}`} style={{ color: tab === "anon" ? "var(--sf-blue)" : "var(--sf-text-weak)", borderBottomColor: tab === "anon" ? "var(--sf-blue)" : "transparent", cursor: "pointer" }} onClick={() => setTab("anon")}>Execute Anonymous</a>
      </div>

      <div className="card" style={{ borderRadius: "0 0 0.5rem 0.5rem" }}>
        <div className="card-body">
          {tab === "query" ? (
            <>
              <textarea className="code-editor" style={{ minHeight: 110 }} value={soql} onChange={(e) => setSoql(e.target.value)} />
              <div className="flex gap mt mb">
                <button className="btn btn-brand" onClick={execQuery} disabled={running}><Icon name="Play" size={14} /> Execute</button>
                {result && <span className="muted" style={{ alignSelf: "center" }}>{result.totalSize} rows · {result.object}</span>}
              </div>
              {queryError && <div className="card" style={{ borderColor: "var(--sf-red)" }}><div className="card-body" style={{ color: "var(--sf-red)", fontFamily: "monospace", fontSize: "0.8rem" }}>{queryError}</div></div>}
              {result && (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr>{result.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                    <tbody>
                      {result.rows.map((row, i) => (
                        <tr key={i}>{result.columns.map((c) => <td key={c}>{row[c] === null ? <span className="muted">null</span> : String(row[c])}</td>)}</tr>
                      ))}
                      {!result.rows.length && <tr><td colSpan={result.columns.length} className="muted">No rows returned.</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <>
              <textarea className="code-editor" value={apex} onChange={(e) => setApex(e.target.value)} />
              <div className="flex gap mt mb">
                <button className="btn btn-brand" onClick={execApex} disabled={running}><Icon name="Play" size={14} /> Execute</button>
              </div>
              <div style={{ background: "#1e1e2e", color: "#cdd6f4", padding: "0.75rem 1rem", borderRadius: "var(--radius)", fontFamily: "monospace", fontSize: "0.78rem", minHeight: 120 }}>
                <div style={{ color: "#6c7086", marginBottom: 6 }}>EXECUTION LOG</div>
                {logs.length ? logs.map((l, i) => {
                  const color = l.startsWith("FATAL") ? "#f38ba8" : l.startsWith("DML") ? "#a6e3a1" : l.startsWith("RESULT") ? "#f9e2af" : "#cdd6f4";
                  return <div key={i} style={{ color }}>{l}</div>;
                }) : <span className="muted">Run code to see logs.</span>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
