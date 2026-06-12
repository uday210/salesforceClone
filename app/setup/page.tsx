"use client";
import Link from "next/link";
import { Icon } from "@/lib/icons";

const TOOLS = [
  { label: "Object Manager", href: "/setup/object-manager", icon: "Database", desc: "Create custom objects, fields, validation rules, record types" },
  { label: "App Manager", href: "/setup/apps", icon: "AppWindow", desc: "Build apps and assign tabs" },
  { label: "Lightning App Builder", href: "/setup/pages", icon: "Layers", desc: "Drag-and-drop record, app, and home pages" },
  { label: "Flows", href: "/setup/flows", icon: "Workflow", desc: "Automate processes with a visual flow builder" },
  { label: "Developer Console", href: "/setup/dev-console", icon: "Code2", desc: "Run SOQL queries and execute anonymous code" },
  { label: "Apex Classes", href: "/setup/apex", icon: "Code2", desc: "Write classes and triggers" },
  { label: "Lightning Components", href: "/setup/lwc", icon: "FileCode", desc: "Author web components" },
  { label: "Visualforce Pages", href: "/setup/vf", icon: "FileCode", desc: "Author markup pages" },
  { label: "Users", href: "/setup/users", icon: "Users", desc: "Manage users and assignments" },
  { label: "Profiles", href: "/setup/profiles", icon: "Shield", desc: "Object & field permissions by profile" },
  { label: "Permission Sets", href: "/setup/permission-sets", icon: "Shield", desc: "Grant additional access" },
  { label: "Custom Labels", href: "/setup/labels", icon: "Tag", desc: "Reusable text values" },
  { label: "Custom Settings", href: "/setup/settings", icon: "SlidersHorizontal", desc: "App configuration data" },
];

export default function SetupHome() {
  return (
    <div>
      <h1 style={{ marginBottom: "0.25rem" }}>Setup</h1>
      <p className="muted mb">Configure and extend your org — objects, automation, code, security, and UI.</p>
      <div className="stat-grid">
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href} className="card" style={{ display: "block", color: "inherit" }}>
            <div className="card-body">
              <span className="record-icon" style={{ background: "var(--sf-blue)", marginBottom: "0.5rem" }}><Icon name={t.icon} size={18} /></span>
              <div style={{ fontWeight: 700 }}>{t.label}</div>
              <div className="muted" style={{ fontSize: "0.78rem" }}>{t.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
