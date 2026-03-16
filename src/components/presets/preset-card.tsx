"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { PRESET_CATEGORIES } from "@/constants/languages";
import type { Preset } from "@/types";

interface PresetCardProps {
  preset: Preset;
  onDelete?: (id: number) => void;
  onSelect?: (preset: Preset) => void;
  isDeleting?: boolean;
}

export function PresetCard({ preset, onDelete, onSelect, isDeleting }: PresetCardProps) {
  const category = PRESET_CATEGORIES.find((c) => c.value === preset.category);

  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={() => onSelect?.(preset)}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h4 className="font-semibold">{preset.name}</h4>
            {preset.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {preset.description}
              </p>
            )}
          </div>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(preset.id);
              }}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={preset.transcription_type === "lite" ? "secondary" : "default"}>
            {preset.transcription_type === "lite" ? "Lite" : "Full"}
          </Badge>
          {category && (
            <span className="text-xs text-muted-foreground">
              {category.icon} {category.label}
            </span>
          )}
          {preset.is_default === 1 && (
            <Badge variant="outline" className="text-xs">
              За замовчуванням
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
