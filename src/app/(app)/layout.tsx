"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { sessionUser, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !sessionUser) {
      router.replace("/login");
    }
  }, [sessionUser, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-muted-foreground">Завантаження...</p>
        </div>
      </div>
    );
  }

  if (!sessionUser) return null;

  // Chat page needs full width without padding
  const isFullWidth = pathname === "/chat";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className={isFullWidth ? "flex-1 overflow-hidden" : "flex-1 p-4 md:p-6 lg:p-8"}>
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
