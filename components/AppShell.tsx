"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/lib/icons";
import { getApps, getTabs, getObjects } from "@/lib/metadata";
import { getCurrentUser, signOut } from "@/lib/session";
import { initials } from "@/lib/format";
import type { SfApp, SfTab, SfObject } from "@/lib/types";
import Modal from "./Modal";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [apps, setApps] = useState<SfApp[]>([]);
  const [tabs, setTabs] = useState<SfTab[]>([]);
  const [objects, setObjects] = useState<SfObject[]>([]);
  const [currentApp, setCurrentApp] = useState<SfApp | null>(null);
  const [launcher, setLauncher] = useState(false);
  const [menu, setMenu] = useState(false);
  const [email, setEmail] = useState("");
  const [search, setSearch] = useState("");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const [a, t, o, u] = await Promise.all([getApps(), getTabs(), getObjects(), getCurrentUser()]);
      setApps(a);
      setTabs(t);
      setObjects(o);
      setEmail(u?.email || "");
      const saved = typeof window !== "undefined" ? localStorage.getItem("sf_app") : null;
      const app = a.find((x) => x.id === saved) || a.find((x) => x.is_default) || a[0] || null;
      setCurrentApp(app);
    })();
  }, []);

  function selectApp(app: SfApp) {
    setCurrentApp(app);
    if (typeof window !== "undefined") localStorage.setItem("sf_app", app.id);
    setLauncher(false);
    router.push("/home");
  }

  const objById = Object.fromEntries(objects.map((o) => [o.id, o]));
  const navTabs = (currentApp?.nav_items || [])
    .map((id) => tabs.find((t) => t.id === id))
    .filter(Boolean) as SfTab[];

  function tabHref(t: SfTab): string {
    if (t.type === "object" && t.object_id) {
      const o = objById[t.object_id];
      return o ? `/o/${o.api_name}` : "#";
    }
    if (t.type === "lightning_page" && t.lightning_page_id) return `/page/${t.lightning_page_id}`;
    if (t.type === "web" && t.url) return t.url;
    return "#";
  }

  function isActive(t: SfTab): boolean {
    if (t.type === "object" && t.object_id) {
      const o = objById[t.object_id];
      return !!o && pathname.startsWith(`/o/${o.api_name}`);
    }
    return false;
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) router.push(`/search?q=${encodeURIComponent(search.trim())}`);
  }

  return (
    <div style={{ ["--app-color" as any]: currentApp?.color || "#0176d3" }}>
      <header className="global-header">
        <button className="app-launcher" onClick={() => setLauncher(true)} title="App Launcher">
          <Icon name="Grid3x3" size={20} />
        </button>
        <form className="global-search" onSubmit={submitSearch}>
          <Icon name="Search" size={16} />
          <input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
        <div className="global-header-right">
          <Link href="/setup" className="btn-icon" title="Setup"><Icon name="Settings" /></Link>
          <button className="btn-icon" title="Notifications"><Icon name="Bell" /></button>
          <div style={{ position: "relative" }}>
            <button className="avatar" onClick={() => setMenu((m) => !m)}>{initials(email)}</button>
            {menu && (
              <div className="card" style={{ position: "absolute", right: 0, top: 40, width: 220, zIndex: 50 }}>
                <div className="card-body" style={{ padding: "0.75rem" }}>
                  <div style={{ fontSize: "0.8rem" }} className="muted">Signed in as</div>
                  <div style={{ fontWeight: 600, marginBottom: "0.5rem", wordBreak: "break-all" }}>{email}</div>
                  <button className="btn btn-sm" style={{ width: "100%" }} onClick={async () => { await signOut(); router.replace("/login"); }}>
                    <Icon name="LogOut" size={14} /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <nav className="nav-bar">
        <Link href="/home" className="nav-app" style={{ color: "inherit" }}>
          <span className="nav-app-icon" style={{ background: currentApp?.color || "var(--brand)" }}>
            <Icon name={currentApp?.icon || "Briefcase"} size={18} />
          </span>
          {currentApp?.label || "Salesforce"}
        </Link>
        <Link href="/home" className={`nav-tab ${pathname === "/home" ? "active" : ""}`}>
          Home
        </Link>
        {navTabs.map((t) => (
          <Link key={t.id} href={tabHref(t)} className={`nav-tab ${isActive(t) ? "active" : ""}`}>
            {t.label}
          </Link>
        ))}
        <Link href="/reports" className={`nav-tab ${pathname.startsWith("/reports") ? "active" : ""}`}>
          Reports
        </Link>
      </nav>

      <main>{children}</main>

      {launcher && (
        <Modal title="App Launcher" onClose={() => setLauncher(false)}>
          <div className="grid-2">
            {apps.map((app) => (
              <button
                key={app.id}
                className="card"
                style={{ textAlign: "left", padding: "1rem", display: "flex", gap: "0.75rem", alignItems: "center", cursor: "pointer" }}
                onClick={() => selectApp(app)}
              >
                <span className="record-icon" style={{ background: app.color }}>
                  <Icon name={app.icon} size={20} />
                </span>
                <span>
                  <div style={{ fontWeight: 700 }}>{app.label}</div>
                  <div className="muted" style={{ fontSize: "0.78rem" }}>{app.description}</div>
                </span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
