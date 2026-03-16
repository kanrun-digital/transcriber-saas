"use client";

import { StatsOverview } from "@/components/dashboard/stats-overview";
import { RecentTranscriptions } from "@/components/dashboard/recent-transcriptions";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Панель керування</h1>
          <p className="text-muted-foreground">Огляд вашого простору</p>
        </div>
        <Button asChild>
          <Link href="/upload">
            <Upload className="w-4 h-4 mr-2" />
            Нова транскрипція
          </Link>
        </Button>
      </div>
      <StatsOverview />
      <RecentTranscriptions />
    </div>
  );
}
