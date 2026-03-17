"use client";

import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePresets } from "@/hooks/use-presets";
import { PRESET_CATEGORIES } from "@/constants/languages";
import type { Preset } from "@/types";

interface PresetSelectorProps {
  onPresetSelect: (preset: Preset | null) => void;
  selectedPresetId?: number | null;
}

export function PresetSelector({ onPresetSelect, selectedPresetId }: PresetSelectorProps) {
  const { data, isLoading } = usePresets();
  const presets = data?.data ?? [];

  const groupedPresets = presets.reduce(
    (acc, preset) => {
      const category = preset.category || "other";
      if (!acc[category]) acc[category] = [];
      acc[category].push(preset);
      return acc;
    },
    {} as Record<string, Preset[]>
  );

  const getCategoryLabel = (category: string) => {
    const cat = PRESET_CATEGORIES.find((c) => c.value === category);
    return cat ? `${cat.icon} ${cat.label}` : category;
  };

  const selectedPreset = presets.find((p) => p.id === selectedPresetId) ?? null;

  const handleValueChange = (value: string) => {
    if (value === "none") {
      onPresetSelect(null);
    } else {
      const preset = presets.find((p) => String(p.id) === value);
      onPresetSelect(preset || null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (presets.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-sm font-medium">Пресет налаштувань</label>
        <Select
          value={selectedPreset ? String(selectedPreset.id) : "none"}
          onValueChange={handleValueChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Оберіть пресет" />
          </SelectTrigger>
          <SelectContent className="max-h-[400px]">
            <SelectItem value="none">
              <span className="text-muted-foreground">Без пресету</span>
            </SelectItem>
            {Object.entries(groupedPresets).map(([category, categoryPresets]) => (
              <SelectGroup key={category}>
                <SelectLabel>{getCategoryLabel(category)}</SelectLabel>
                {categoryPresets.map((preset) => (
                  <SelectItem key={preset.id} value={String(preset.id)}>
                    <div className="flex items-center gap-2">
                      <span>{preset.title}</span>
                      <Badge
                        variant={
                          preset.transcription_type === "lite" ? "secondary" : "default"
                        }
                        className="text-xs"
                      >
                        {preset.transcription_type === "lite" ? "Lite" : "Full"}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedPreset && (
        <Card className="p-4 bg-muted/50">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">{selectedPreset.title}</h4>
              <Badge
                variant={
                  selectedPreset.transcription_type === "lite" ? "secondary" : "default"
                }
              >
                {selectedPreset.transcription_type === "lite" ? "Lite Mode" : "Full Mode"}
              </Badge>
            </div>
            {selectedPreset.description && (
              <p className="text-sm text-muted-foreground">{selectedPreset.description}</p>
            )}
            {selectedPreset.category && (
              <div className="text-xs text-muted-foreground">
                Категорія: {getCategoryLabel(selectedPreset.category)}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
