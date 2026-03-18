"use client";

import { useState, useEffect } from "react";
import { useWorkspace } from "@/hooks/use-workspace";
import { useAuthStore } from "@/stores/auth-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Settings, User, MessageSquare, Loader2, Save, Brain } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { sessionUser } = useAuthStore();
  const { workspace, workspaceId } = useWorkspace();
  const [saving, setSaving] = useState(false);

  // Chat settings from workspace metadata
  const [contextMessages, setContextMessages] = useState(30);
  const [defaultModel, setDefaultModel] = useState("openai/gpt-4o-mini");
  const [wsName, setWsName] = useState("");

  useEffect(() => {
    if (workspace) {
      setWsName(workspace.name || "");
      setDefaultModel(workspace.default_model_id || "openai/gpt-4o-mini");
      try {
        const meta = workspace.metadata_json
          ? (typeof workspace.metadata_json === "string" ? JSON.parse(workspace.metadata_json) : workspace.metadata_json)
          : {};
        if (meta.chat_context_messages) setContextMessages(Number(meta.chat_context_messages));
      } catch {}
    }
  }, [workspace]);

  const handleSave = async () => {
    if (!workspaceId) return;
    setSaving(true);
    try {
      // Build metadata
      let existingMeta: any = {};
      try {
        existingMeta = workspace?.metadata_json
          ? (typeof workspace.metadata_json === "string" ? JSON.parse(workspace.metadata_json) : workspace.metadata_json)
          : {};
      } catch {}

      const newMeta = {
        ...existingMeta,
        chat_context_messages: contextMessages,
      };

      const res = await fetch("/api/admin/workspaces", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: workspaceId,
          name: wsName,
          default_model_id: defaultModel,
          metadata_json: JSON.stringify(newMeta),
        }),
      });

      if (!res.ok) throw new Error("Failed to save");
      toast.success("Налаштування збережено");
    } catch (err: any) {
      toast.error(err.message || "Помилка збереження");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Налаштування</h1>
        <p className="text-muted-foreground">Керуйте профілем, воркспейсом та AI чатом</p>
      </div>

      {/* Profile */}
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

      {/* Workspace */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5" /> Воркспейс</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Назва воркспейсу</Label>
            <Input value={wsName} onChange={(e) => setWsName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
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
            <div>
              <span className="text-muted-foreground">Сховище</span>
              <p className="font-medium">{workspace?.max_storage_gb || 10} GB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Chat Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5" /> AI Чат</CardTitle>
          <CardDescription>Налаштування моделі та контексту розмови</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Модель за замовчуванням</Label>
            <Select value={defaultModel} onValueChange={setDefaultModel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="openai/gpt-4o-mini">GPT-4o Mini (0.4 coins)</SelectItem>
                <SelectItem value="openai/gpt-4o">GPT-4o (2.4 coins)</SelectItem>
                <SelectItem value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet (3 coins)</SelectItem>
                <SelectItem value="anthropic/claude-3-haiku">Claude 3 Haiku (0.25 coins)</SelectItem>
                <SelectItem value="google/gemini-1.5-flash">Gemini 1.5 Flash (0.15 coins)</SelectItem>
                <SelectItem value="google/gemini-1.5-pro">Gemini 1.5 Pro (1.75 coins)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Контекст розмови: {contextMessages} повідомлень</Label>
            <input
              type="range"
              min={5}
              max={50}
              step={5}
              value={contextMessages}
              onChange={(e) => setContextMessages(Number(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5 (швидко, дешево)</span>
              <span>50 (більше контексту)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Зберегти налаштування
      </Button>
    </div>
  );
}
