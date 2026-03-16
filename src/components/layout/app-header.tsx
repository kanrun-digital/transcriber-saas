"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { UserMenu } from "./user-menu";
import {
  LayoutDashboard,
  Upload,
  FileText,
  MessageSquare,
  Settings,
  Sliders,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants/routes";
import { useWorkspace } from "@/hooks/use-workspace";
import { useState } from "react";

const NAV_ITEMS = [
  { href: ROUTES.DASHBOARD, label: "Дашборд", icon: LayoutDashboard },
  { href: ROUTES.UPLOAD, label: "Завантажити", icon: Upload },
  { href: ROUTES.TRANSCRIPTIONS, label: "Транскрипції", icon: FileText },
  { href: ROUTES.PRESETS, label: "Пресети", icon: Sliders },
  { href: ROUTES.CHAT, label: "Чат з AI", icon: MessageSquare },
  { href: ROUTES.SETTINGS, label: "Налаштування", icon: Settings },
];

export function AppHeader() {
  const pathname = usePathname();
  const { isAdmin } = useWorkspace();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6">
      {/* Mobile menu */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex h-14 items-center border-b px-4">
            <span className="text-xl font-bold">🎙️ Transcriber</span>
          </div>
          <nav className="space-y-1 p-3">
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                href={ROUTES.ADMIN}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname === ROUTES.ADMIN
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Shield className="h-4 w-4" />
                Адмін
              </Link>
            )}
          </nav>
        </SheetContent>
      </Sheet>

      <div className="flex-1" />

      <UserMenu />
    </header>
  );
}
