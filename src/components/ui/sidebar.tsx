"use client"

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function SidebarTrigger({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return null;
}
