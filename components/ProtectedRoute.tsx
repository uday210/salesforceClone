"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { clearUserCache } from "@/lib/session";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) {
        setAuthed(true);
        setReady(true);
      } else {
        router.replace("/login");
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!mounted) return;
      if (!session) {
        clearUserCache();
        router.replace("/login");
      } else {
        setAuthed(true);
      }
    });
    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="center-screen">
        <div className="spinner" />
        <p className="muted">Loading your org…</p>
      </div>
    );
  }
  if (!authed) return null;
  return <>{children}</>;
}
