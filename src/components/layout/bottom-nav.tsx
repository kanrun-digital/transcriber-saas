"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  MessageSquare,
  FileText,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TAB_ITEMS = [
  { href: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
  { href: "/projects", label: "Проекти", icon: FolderOpen },
  { href: "/chat", label: "Чат", icon: MessageSquare, primary: true },
  { href: "/transcriptions", label: "Транскрипції", icon: FileText },
  { href: "/settings", label: "Ще", icon: MoreHorizontal },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-14">
        {TAB_ITEMS.map((item: any) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const isPrimary = item.primary || false;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] px-2 py-1 rounded-lg transition-colors active:scale-95",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground",
                isPrimary && !isActive && "text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full transition-colors",
                  isPrimary && isActive && "bg-primary text-primary-foreground",
                  isPrimary && !isActive && "bg-muted"
                )}
              >
                <item.icon className={cn("w-5 h-5", isPrimary && "w-5 h-5")} />
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium leading-tight",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
