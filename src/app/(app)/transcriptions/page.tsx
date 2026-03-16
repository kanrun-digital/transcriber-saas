"use client";

import { useState } from "react";
import { useTranscriptions } from "@/hooks/use-transcriptions";
import { TranscriptionTable } from "@/components/transcriptions/transcription-table";
import { TranscriptionCard } from "@/components/transcriptions/transcription-card";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, FileText, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { TRANSCRIPTION_STATUS } from "@/constants/entities";

export default function TranscriptionsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const isMobile = useIsMobile();
  const { data, isLoading } = useTranscriptions({ status: statusFilter === "all" ? undefined : statusFilter });
  const transcriptions = data?.data || [];

  const filtered = transcriptions.filter(t =>
    (t.original_filename || "").toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: transcriptions.length,
    completed: transcriptions.filter(t => t.status === TRANSCRIPTION_STATUS.COMPLETED).length,
    processing: transcriptions.filter(t => t.status === TRANSCRIPTION_STATUS.TRANSCRIBING).length,
    failed: transcriptions.filter(t => t.status === TRANSCRIPTION_STATUS.FAILED).length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Транскрипції</h1>
        <p className="text-muted-foreground">Всі ваші аудіо та відео файли</p>
      </div>

      {!isMobile && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Всього", value: stats.total, icon: FileText },
            { label: "Готових", value: stats.completed, icon: CheckCircle },
            { label: "В обробці", value: stats.processing, icon: Clock },
            { label: "Помилок", value: stats.failed, icon: AlertTriangle },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="text-2xl font-bold">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className={`flex gap-3 ${isMobile ? "flex-col" : "items-center justify-between"}`}>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className={isMobile ? "w-full grid grid-cols-4" : ""}>
            <TabsTrigger value="all">Всі</TabsTrigger>
            <TabsTrigger value="completed">Готові</TabsTrigger>
            <TabsTrigger value="transcribing">В обробці</TabsTrigger>
            <TabsTrigger value="failed">Помилки</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Пошук за назвою..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`pl-10 ${isMobile ? "h-11" : "w-64"}`} />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Завантаження...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Транскрипцій не знайдено</p>
        </div>
      ) : isMobile ? (
        <div className="space-y-3">
          {filtered.map(t => <TranscriptionCard key={t.id} transcription={t} />)}
        </div>
      ) : (
        <TranscriptionTable transcriptions={filtered} />
      )}
    </div>
  );
}
