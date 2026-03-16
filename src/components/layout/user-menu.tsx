"use client";

import { LogOut, User, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { ROUTES } from "@/constants/routes";
import Link from "next/link";

export function UserMenu() {
  const { sessionUser, appUser, signOut } = useAuth();

  const initials = (sessionUser?.name || sessionUser?.email || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">
              {sessionUser?.name || "Користувач"}
            </p>
            <p className="text-xs text-muted-foreground">
              {sessionUser?.email}
            </p>
            {appUser && (
              <p className="text-xs text-muted-foreground capitalize">
                {appUser.role}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={ROUTES.SETTINGS} className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Налаштування
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex items-center gap-2 text-destructive focus:text-destructive"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4" />
          Вийти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
