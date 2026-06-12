import "@/styles/globals.css";
import type { Metadata } from "next";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "Salesforce Clone",
  description: "A metadata-driven Salesforce-style platform built with Next.js and Supabase.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
