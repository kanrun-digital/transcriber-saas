"use client";

import { useState } from "react";
import { usePresets } from "@/hooks/use-presets";
import { PresetCard } from "@/components/presets/preset-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, User, FileText, Zap } from "lucide-react";

export default function PresetsPage() {
  const { data, isLoading } = usePresets();
const presets = data?.data || [];
const publicPresets = presets.filter(p => p.is_public);
const myPresets = presets.filter(p => !p.is_public);


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Пресети</h1>
        <p className="text-muted-foreground">Збережені налаштування транскрипції</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Публічні", value: publicPresets.length, icon: Globe },
          { label: "Мої", value: myPresets.length, icon: User },
          { label: "Full", value: presets.filter(p => p.transcription_type === "full").length, icon: FileText },
{ label: "Lite", value: presets.filter(p => p.transcription_type === "lite").length, icon: Zap },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-3"><p className="text-2xl font-bold">{value}</p></CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="public">
        <TabsList>
          <TabsTrigger value="public">Публічні ({publicPresets.length})</TabsTrigger>
          <TabsTrigger value="my">Мої ({myPresets.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="public" className="mt-4">
          {isLoading ? <p className="text-muted-foreground">Завантаження...</p> :
            publicPresets.length === 0 ? <p className="text-muted-foreground">Публічних пресетів немає</p> :
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {publicPresets.map(p => <PresetCard key={p.id} preset={p} />)}
            </div>
          }
        </TabsContent>
        <TabsContent value="my" className="mt-4">
          {isLoading ? <p className="text-muted-foreground">Завантаження...</p> :
            myPresets.length === 0 ? <p className="text-muted-foreground">У вас ще немає пресетів</p> :
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myPresets.map(p => <PresetCard key={p.id} preset={p} />)}
            </div>
          }
        </TabsContent>
      </Tabs>
    </div>
  );
}
