"use client";

import { useWorkspace } from "@/hooks/use-workspace";
import { useAuthStore } from "@/stores/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, User } from "lucide-react";

export default function SettingsPage() {
  const { sessionUser } = useAuthStore();
  const { workspace } = useWorkspace();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Налаштування</h1>
        <p className="text-muted-foreground">Керуйте своїм профілем та воркспейсом</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Профіль</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Email</span>
              <p className="font-medium">{sessionUser?.email || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Ім'я</span>
              <p className="font-medium">{sessionUser?.name || "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5" /> Воркспейс</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Назва</span>
              <p className="font-medium">{workspace?.name || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">План</span>
              <p className="font-medium capitalize">{workspace?.plan || "free"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Salad режим</span>
              <p className="font-medium capitalize">{workspace?.default_salad_mode || "full"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Макс. файл</span>
              <p className="font-medium">{workspace?.max_file_size_mb || 500} MB</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
