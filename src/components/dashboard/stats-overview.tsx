"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, Cpu, HardDrive, Database } from "lucide-react";
import { formatMinutes, formatBytes, formatPercent } from "@/lib/utils";
import { useUsage } from "@/hooks/use-usage";
import { Skeleton } from "@/components/ui/skeleton";

export function StatsOverview() {
  const { data: usage, isLoading } = useUsage();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!usage) return null;

  const stats = [
    {
      title: "Транскрипція",
      value: formatMinutes(usage.transcription.used),
      subtitle: `з ${formatMinutes(usage.transcription.limit)}`,
      percent: usage.transcription.percent,
      icon: Clock,
    },
    {
      title: "AI кредити",
      value: `${usage.ai.used}`,
      subtitle: `з ${usage.ai.limit} монет`,
      percent: usage.ai.percent,
      icon: Cpu,
    },
    {
      title: "Сховище",
      value: `${usage.storage.usedGb} ГБ`,
      subtitle: `з ${usage.storage.limitGb} ГБ`,
      percent: usage.storage.percent,
      icon: HardDrive,
    },
    {
      title: "RAG бази",
      value: `${usage.quotas.ragBases}`,
      subtitle: "максимум",
      percent: 0,
      icon: Database,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
            {stat.percent > 0 && (
              <Progress value={stat.percent} className="mt-2 h-1.5" />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
