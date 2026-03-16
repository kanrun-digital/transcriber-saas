"use client"

import React from "react";

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen">{children}</div>;
}

export function SidebarInset({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 flex flex-col min-w-0">{children}</div>;
}

export function SidebarTrigger({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return null;
}
