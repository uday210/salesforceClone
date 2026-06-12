"use client";
import { createContext, useCallback, useContext, useState } from "react";

type ToastKind = "info" | "success" | "error";
const ToastCtx = createContext<(msg: string, kind?: ToastKind) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ msg: string; kind: ToastKind } | null>(null);

  const show = useCallback((msg: string, kind: ToastKind = "info") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3000);
  }, []);

  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && <div className={`toast ${toast.kind}`}>{toast.msg}</div>}
    </ToastCtx.Provider>
  );
}
