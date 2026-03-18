"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  FileText,
  MessageSquare,
  Settings,
  Sliders,
  Shield,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants/routes";
import { useWorkspace } from "@/hooks/use-workspace";

const NAV_ITEMS = [
  { href: ROUTES.DASHBOARD, label: "Дашборд", icon: LayoutDashboard },
  { href: ROUTES.UPLOAD, label: "Завантажити", icon: Upload },
  { href: ROUTES.TRANSCRIPTIONS, label: "Транскрипції", icon: FileText },
  { href: ROUTES.PRESETS, label: "Пресети", icon: Sliders },
  { href: "/projects", label: "Проекти", icon: FolderOpen },
  { href: ROUTES.CHAT, label: "Чат з AI", icon: MessageSquare },
  { href: ROUTES.SETTINGS, label: "Налаштування", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { isAdmin, workspaceName } = useWorkspace();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:border-r bg-card">
      <div className="flex h-14 items-center border-b px-4">
        <Link href={ROUTES.DASHBOARD} className="flex items-center gap-2">
          <span className="text-xl font-bold">🎙️</span>
          <span className="font-semibold truncate">{workspaceName || "Transcriber"}</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
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
    </aside>
  );
}
