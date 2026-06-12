"use client";
import { useEffect, useRef } from "react";
import { runApex } from "@/lib/apexRuntime";

// Hosts an "LWC-style" component in a sandboxed iframe and provides:
//  - lifecycle hooks: connectedCallback(), renderedCallback(), disconnectedCallback()
//  - callApex(className, methodName, ...args) -> Promise, bridged to the Apex runtime
export default function LwcHost({
  html, js, css, height = 360,
}: {
  html: string; js: string; css: string; height?: number;
}) {
  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    async function onMessage(e: MessageEvent) {
      const d = e.data || {};
      if (d.__lwc !== "apex") return;
      const win = ref.current?.contentWindow;
      if (e.source !== win) return;
      try {
        const argList = (d.args || []).map((a: any) => JSON.stringify(a)).join(", ");
        const body = `return await ${d.className}.${d.methodName}(${argList});`;
        const res = await runApex(body, { withLibrary: true });
        win?.postMessage({ __lwc: "apexResult", id: d.id, result: res.result, error: res.error }, "*");
      } catch (err: any) {
        win?.postMessage({ __lwc: "apexResult", id: d.id, error: err.message }, "*");
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const runtime = `
    const __pending = {}; let __seq = 0;
    window.callApex = (className, methodName, ...args) => new Promise((resolve, reject) => {
      const id = ++__seq; __pending[id] = { resolve, reject };
      parent.postMessage({ __lwc: 'apex', id, className, methodName, args }, '*');
    });
    window.addEventListener('message', (e) => {
      const d = e.data || {};
      if (d.__lwc === 'apexResult' && __pending[d.id]) {
        d.error ? __pending[d.id].reject(new Error(d.error)) : __pending[d.id].resolve(d.result);
        delete __pending[d.id];
      }
    });
    function __mount(){
      try { ${js} } catch(e){ document.body.insertAdjacentHTML('beforeend','<pre style=color:#ba0517>'+e.message+'</pre>'); }
      try { if (typeof connectedCallback==='function') connectedCallback(); } catch(e){}
      requestAnimationFrame(() => { try { if (typeof renderedCallback==='function') renderedCallback(); } catch(e){} });
    }
    window.addEventListener('pagehide', () => { try { if (typeof disconnectedCallback==='function') disconnectedCallback(); } catch(e){} });
    if (document.readyState !== 'loading') __mount(); else document.addEventListener('DOMContentLoaded', __mount);
  `;

  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;margin:0;padding:12px;color:#080707}${css}</style></head><body>${html}<script>${runtime}<\/script></body></html>`;

  return (
    <iframe
      ref={ref}
      title="lwc-preview"
      srcDoc={srcDoc}
      style={{ width: "100%", height, border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "#fff" }}
      sandbox="allow-scripts"
    />
  );
}
