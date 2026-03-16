"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TranscriptionCard } from "@/components/transcriptions/transcription-card";
import { useTranscriptions } from "@/hooks/use-transcriptions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { ArrowRight } from "lucide-react";

export function RecentTranscriptions() {
  const { data, isLoading } = useTranscriptions({ page: 1 });

  const transcriptions = data?.data?.slice(0, 5) ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Останні транскрипції</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href={ROUTES.TRANSCRIPTIONS} className="flex items-center gap-1">
            Всі
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))
        ) : transcriptions.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            Ще немає транскрипцій. Завантажте перший файл!
          </p>
        ) : (
          transcriptions.map((tx) => (
            <TranscriptionCard key={tx.id} transcription={tx} />
          ))
        )}
      </CardContent>
    </Card>
  );
}
