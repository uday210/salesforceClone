import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}
