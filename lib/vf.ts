// Very small Visualforce-style markup -> HTML transformer (demonstration only).
export function renderVf(markup: string): string {
  return markup
    .replace(/<apex:page[^>]*>/gi, '<div class="vf-page">')
    .replace(/<\/apex:page>/gi, "</div>")
    .replace(/<apex:pageBlock(?:\s+title="([^"]*)")?[^>]*>/gi, (_m, t) => `<div class="card mb"><div class="card-header"><h3>${t || "Page Block"}</h3></div><div class="card-body">`)
    .replace(/<\/apex:pageBlock>/gi, "</div></div>")
    .replace(/<apex:pageBlockSection[^>]*>/gi, '<div class="vf-section">')
    .replace(/<\/apex:pageBlockSection>/gi, "</div>")
    .replace(/\{!\$User\.Name\}/gi, "Current User")
    .replace(/\{![^}]*\}/g, "<em>(merge field)</em>");
}
