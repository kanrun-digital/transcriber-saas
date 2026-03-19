"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";

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

  // Chat page gets full-height treatment (no padding, no bottom nav space)
  const isChatPage = pathname === "/chat";
  // Full-width pages don't get side padding
  const isFullWidth = isChatPage;

  return (
    <SidebarProvider>
      {/* Desktop sidebar — hidden on mobile via the component itself */}
      <AppSidebar />
      <SidebarInset>
        {/* App header — hidden on mobile for chat, visible elsewhere */}
        <div className={isChatPage ? "hidden md:block" : ""}>
          <AppHeader />
        </div>
        <main
          className={
            isChatPage
              ? "flex-1 overflow-hidden"
              : isFullWidth
                ? "flex-1 overflow-hidden pb-16 md:pb-0"
                : "flex-1 p-4 md:p-6 lg:p-8 pb-20 md:pb-6 lg:pb-8"
          }
        >
          {children}
        </main>
      </SidebarInset>
      {/* Mobile bottom nav — hidden on chat page (chat has its own full-height layout) */}
      {!isChatPage && <BottomNav />}
    </SidebarProvider>
  );
}
