"use client";

import Link from "next/link";
import { Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./status-badge";
import { ROUTES } from "@/constants/routes";
import { formatBytes, formatDuration, formatDate } from "@/lib/utils";
import type { Transcription } from "@/types";

interface TranscriptionTableProps {
  transcriptions: Transcription[];
  onDelete?: (id: number) => void;
  isDeleting?: boolean;
}

export function TranscriptionTable({
  transcriptions,
  onDelete,
  isDeleting,
}: TranscriptionTableProps) {
  if (transcriptions.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        Транскрипцій поки немає
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Файл</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead className="hidden md:table-cell">Режим</TableHead>
            <TableHead className="hidden md:table-cell">Розмір</TableHead>
            <TableHead className="hidden lg:table-cell">Тривалість</TableHead>
            <TableHead className="hidden lg:table-cell">Дата</TableHead>
            <TableHead className="text-right">Дії</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transcriptions.map((tx) => (
            <TableRow key={tx.id}>
              <TableCell>
                <Link
                  href={ROUTES.TRANSCRIPTION_DETAIL(tx.id)}
                  className="font-medium hover:underline truncate block max-w-[200px] md:max-w-[300px]"
                >
                  {tx.original_filename || "Без назви"}
                </Link>
                {tx.language && (
                  <span className="text-xs text-muted-foreground uppercase">
                    {tx.language}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <StatusBadge status={tx.status} ragStatus={tx.rag_status} />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge variant="outline" className="text-xs">
                  {tx.salad_mode === "lite" ? "Lite" : "Full"}
                </Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                {formatBytes(tx.file_size_bytes)}
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                {formatDuration(tx.duration_seconds)}
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                {formatDate(tx.created_at)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={ROUTES.TRANSCRIPTION_DETAIL(tx.id)}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(tx.id)}
                      disabled={isDeleting}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
