"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/lib/icons";

const GROUPS: { title: string; items: { label: string; href: string; icon: string }[] }[] = [
  {
    title: "Platform Tools",
    items: [
      { label: "Object Manager", href: "/setup/object-manager", icon: "Database" },
      { label: "App Manager", href: "/setup/apps", icon: "AppWindow" },
      { label: "Tabs", href: "/setup/tabs", icon: "Layout" },
    ],
  },
  {
    title: "User Interface",
    items: [
      { label: "Lightning App Builder", href: "/setup/pages", icon: "Layers" },
    ],
  },
  {
    title: "Automation",
    items: [
      { label: "Flows", href: "/setup/flows", icon: "Workflow" },
    ],
  },
  {
    title: "Custom Code",
    items: [
      { label: "Apex Classes", href: "/setup/apex", icon: "Code2" },
      { label: "Lightning Components", href: "/setup/lwc", icon: "FileCode" },
      { label: "Visualforce Pages", href: "/setup/vf", icon: "FileCode" },
    ],
  },
  {
    title: "Users & Security",
    items: [
      { label: "Users", href: "/setup/users", icon: "Users" },
      { label: "Profiles", href: "/setup/profiles", icon: "Shield" },
      { label: "Permission Sets", href: "/setup/permission-sets", icon: "Shield" },
    ],
  },
  {
    title: "Custom Settings",
    items: [
      { label: "Custom Labels", href: "/setup/labels", icon: "Tag" },
      { label: "Custom Settings", href: "/setup/settings", icon: "SlidersHorizontal" },
    ],
  },
];

export default function SetupNav() {
  const pathname = usePathname();
  return (
    <nav className="setup-nav">
      <Link href="/setup" className={`${pathname === "/setup" ? "active" : ""}`} style={{ fontWeight: 700 }}>
        <Icon name="Settings" size={14} /> Setup Home
      </Link>
      {GROUPS.map((g) => (
        <div key={g.title}>
          <div className="setup-nav-group">{g.title}</div>
          {g.items.map((it) => (
            <Link key={it.href} href={it.href} className={pathname.startsWith(it.href) ? "active" : ""}>
              {it.label}
            </Link>
          ))}
        </div>
      ))}
      <div style={{ marginTop: "1rem", padding: "0 0.75rem" }}>
        <Link href="/home" className="btn btn-sm" style={{ width: "100%" }}><Icon name="ArrowLeft" size={12} /> Back to App</Link>
      </div>
    </nav>
  );
}
