"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import SetupNav from "@/components/Sidebar";
import { Icon } from "@/lib/icons";
import { signOut } from "@/lib/session";

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <ProtectedRoute>
      <header className="global-header">
        <Link href="/home" className="app-launcher"><Icon name="Grid3x3" size={18} /></Link>
        <span className="app-name"><Icon name="Settings" size={16} /> Setup</span>
        <div className="global-header-right">
          <button className="btn btn-sm" onClick={async () => { await signOut(); router.replace("/login"); }}>
            <Icon name="LogOut" size={14} /> Sign Out
          </button>
        </div>
      </header>
      <div className="setup-shell">
        <SetupNav />
        <div className="setup-main">{children}</div>
      </div>
    </ProtectedRoute>
  );
}
