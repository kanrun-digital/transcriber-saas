"use client";

import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Upload, Clock, AlertTriangle } from "lucide-react";
import { getCompositeStatus } from "@/constants/entities";

interface StatusBadgeProps {
  status: string;
  ragStatus: string;
}

const COLOR_MAP: Record<string, string> = {
  gray: "bg-muted text-muted-foreground border-border",
  blue: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  green: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
  yellow: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800",
  orange: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800",
  red: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
};

const ICON_MAP: Record<string, React.ReactNode> = {
  upload: <Upload className="h-3 w-3" />,
  spinner: <Loader2 className="h-3 w-3 animate-spin" />,
  check: <CheckCircle className="h-3 w-3" />,
  queue: <Clock className="h-3 w-3" />,
  index: <Loader2 className="h-3 w-3 animate-spin" />,
  warning: <AlertTriangle className="h-3 w-3" />,
  error: <XCircle className="h-3 w-3" />,
};

export function StatusBadge({ status, ragStatus }: StatusBadgeProps) {
  const composite = getCompositeStatus(status, ragStatus);

  return (
    <Badge variant="outline" className={COLOR_MAP[composite.color]}>
      <span className="flex items-center gap-1">
        {ICON_MAP[composite.icon]}
        {composite.label}
      </span>
    </Badge>
  );
}
