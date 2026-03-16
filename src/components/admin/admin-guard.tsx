"use client";

import { useAuthStore } from "@/stores/auth-store";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { isAdmin } = useAuthStore();

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            Доступ заборонено. Ця сторінка доступна тільки адміністраторам.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
