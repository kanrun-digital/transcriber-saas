"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { apiGet, apiPost, apiPut, apiDelete } from "@/services/api-client";
import { API_ROUTES } from "@/constants/routes";
import { useWorkspace } from "@/hooks/use-workspace";
import { formatDate } from "@/lib/utils";
import {
  FolderOpen,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  FileText,
  Brain,
  Search,
  Upload,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Project {
  id: number;
  workspace_id: number;
  owner_user_id: number;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  is_archived: number;
  created_at: string;
}

interface Transcription {
  id: number;
  workspace_id: number;
  project_id: number | null;
  title: string;
  created_at: string;
  status?: string;
  [key: string]: unknown;
}

interface RagBase {
  id: number;
  project_id: number;
  [key: string]: unknown;
}

interface BulkFileItem {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROJECT_COLORS = [
  { label: "Синій", value: "#3B82F6" },
  { label: "Зелений", value: "#22C55E" },
  { label: "Червоний", value: "#EF4444" },
  { label: "Фіолетовий", value: "#A855F7" },
  { label: "Помаранчевий", value: "#F97316" },
  { label: "Рожевий", value: "#EC4899" },
  { label: "Жовтий", value: "#EAB308" },
  { label: "Бірюзовий", value: "#14B8A6" },
] as const;

const DEFAULT_COLOR = PROJECT_COLORS[0].value;

const ACCEPTED_MEDIA_TYPES = [
  "audio/*",
  "video/*",
].join(",");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function colorDot(color: string | null) {
  return (
    <span
      className="inline-block h-3 w-3 rounded-full shrink-0"
      style={{ backgroundColor: color ?? DEFAULT_COLOR }}
    />
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function ProjectsPage() {
  const { workspace, workspaceId, appUser } = useWorkspace();
  const qc = useQueryClient();

  // ---- local state ---------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);

  // Bulk upload state
  const [bulkFiles, setBulkFiles] = useState<BulkFileItem[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const bulkInputRef = useRef<HTMLInputElement>(null);

  // ---- queries -------------------------------------------------------------

  const projectsQuery = useQuery<Project[]>({
    queryKey: ["projects", workspaceId],
    queryFn: () => apiGet(API_ROUTES.DATA("projects"), { workspace_id: workspaceId || 0 }),
    enabled: !!workspaceId,
  });

  // Transcription counts per project (fetch ALL workspace transcriptions once)
  const allTranscriptionsQuery = useQuery<Transcription[]>({
    queryKey: ["transcriptions", workspaceId],
    queryFn: () => apiGet(API_ROUTES.DATA("transcriptions"), { workspace_id: workspaceId || 0 }),
    enabled: !!workspaceId,
  });

  // Transcriptions for the selected project
  const projectTranscriptionsQuery = useQuery<Transcription[]>({
    queryKey: ["transcriptions", workspaceId, selectedProjectId],
    queryFn: () =>
      apiGet(API_ROUTES.DATA("transcriptions"), {
        workspace_id: workspaceId || 0,
        project_id: selectedProjectId || 0,
      }),
    enabled: !!workspaceId && selectedProjectId !== null,
  });

  // RAG bases for workspace
  const ragQuery = useQuery<RagBase[]>({
    queryKey: ["rag-bases", workspaceId],
    queryFn: () => apiGet(API_ROUTES.DATA("rag_bases"), { workspace_id: workspaceId || 0 }),
    enabled: !!workspaceId,
  });

  // ---- derived data --------------------------------------------------------

  const projects = Array.isArray(projectsQuery.data) ? projectsQuery.data : (projectsQuery.data as any)?.data ?? [];
  const allTranscriptions = Array.isArray(allTranscriptionsQuery.data) ? allTranscriptionsQuery.data : (allTranscriptionsQuery.data as any)?.data ?? [];
  const projectTranscriptions = Array.isArray(projectTranscriptionsQuery.data) ? projectTranscriptionsQuery.data : (projectTranscriptionsQuery.data as any)?.data ?? [];
  const ragBases = Array.isArray(ragQuery.data) ? ragQuery.data : (ragQuery.data as any)?.data ?? [];

  const transcriptionCountMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const t of allTranscriptions) {
      if (t.project_id != null) {
        map.set(t.project_id, (map.get(t.project_id) ?? 0) + 1);
      }
    }
    return map;
  }, [allTranscriptions]);

  const ragProjectIds = useMemo(
    () => new Set(ragBases.map((r: any) => r.project_id)),
    [ragBases],
  );

  const unassignedTranscriptions = useMemo(
    () => allTranscriptions.filter((t: any) => t.project_id == null),
    [allTranscriptions],
  );

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter(
      (p: any) =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q),
    );
  }, [projects, searchQuery]);

  const selectedProject = projects.find((p: any) => p.id === selectedProjectId) ?? null;

  // ---- bulk upload logic ----------------------------------------------------

  const bulkDoneCount = bulkFiles.filter((f: any) => f.status === "done").length;
  const bulkErrorCount = bulkFiles.filter((f: any) => f.status === "error").length;
  const bulkTotalCount = bulkFiles.length;

  const handleBulkFilesSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const items: BulkFileItem[] = Array.from(fileList).map((file: any) => ({
      file,
      status: "pending" as const,
    }));
    setBulkFiles(items);
    // Reset file input so re-selecting the same files triggers onChange
    if (bulkInputRef.current) {
      bulkInputRef.current.value = "";
    }
  }, []);

  const handleBulkUpload = useCallback(async () => {
    if (bulkFiles.length === 0 || !selectedProjectId) return;

    setBulkUploading(true);

    const updated = [...bulkFiles];

    for (let i = 0; i < updated.length; i++) {
      const item = updated[i];
      if (item.status === "done") continue;

      // Mark uploading
      updated[i] = { ...item, status: "uploading" };
      setBulkFiles([...updated]);

      try {
        // Step 1: Presign
        const presignRes = await fetch("/api/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: item.file.name,
            contentType: item.file.type || "application/octet-stream",
            size: item.file.size,
            workspaceId: workspaceId || 0,
            appUserId: appUser?.id || 0,
            projectId: selectedProjectId,
          }),
        });

        if (!presignRes.ok) {
          throw new Error(`Presign failed: ${presignRes.status}`);
        }

        const presignData = await presignRes.json();
        const presignedUrl = presignData.uploadUrl || presignData.presignedUrl || presignData.url;
        const transcriptionId = presignData.transcriptionId;

        if (!presignedUrl) {
          throw new Error("No presigned URL returned");
        }

        // Step 2: Upload to S3
        const uploadRes = await fetch(presignedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": item.file.type || "application/octet-stream",
          },
          body: item.file,
        });

        if (!uploadRes.ok) {
          throw new Error(`S3 upload failed: ${uploadRes.status}`);
        }

        // Step 3: Complete (no settings for bulk — transcription starts manually)
        const completeRes = await fetch("/api/upload/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcriptionId,
            workspaceId: workspaceId || 0,
            settings: {},
          }),
        });

        if (!completeRes.ok) {
          throw new Error(`Complete failed: ${completeRes.status}`);
        }

        updated[i] = { ...item, status: "done" };
        setBulkFiles([...updated]);
      } catch (err: any) {
        updated[i] = {
          ...item,
          status: "error",
          error: err?.message || "Невідома помилка",
        };
        setBulkFiles([...updated]);
      }
    }

    setBulkUploading(false);

    const doneCount = updated.filter((f: any) => f.status === "done").length;
    const errCount = updated.filter((f: any) => f.status === "error").length;

    if (errCount === 0) {
      toast.success(`Завантажено ${doneCount} ${pluralFiles(doneCount)}`);
    } else {
      toast.warning(`Завантажено ${doneCount}/${updated.length}, помилок: ${errCount}`);
    }

    // Refresh transcription lists
    qc.invalidateQueries({ queryKey: ["transcriptions", workspaceId] });
    qc.invalidateQueries({ queryKey: ["transcriptions", workspaceId, selectedProjectId] });
  }, [bulkFiles, selectedProjectId, workspaceId, appUser, qc]);

  const handleBulkClear = useCallback(() => {
    setBulkFiles([]);
  }, []);

  // ---- mutations -----------------------------------------------------------

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["projects", workspaceId] });
    qc.invalidateQueries({ queryKey: ["transcriptions", workspaceId] });
    qc.invalidateQueries({ queryKey: ["rag-bases", workspaceId] });
  };

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description: string; color: string }) =>
      apiPost(API_ROUTES.DATA("projects"), {
        workspace_id: workspaceId || 0,
        owner_user_id: appUser?.id || 0,
        name: data.name,
        description: data.description || null,
        color: data.color,
      }),
    onSuccess: () => {
      toast.success("Проєкт створено");
      invalidateAll();
      setCreateOpen(false);
    },
    onError: () => toast.error("Не вдалося створити проєкт"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number; name: string; description: string; color: string }) =>
      apiPut(API_ROUTES.DATA_RECORD("projects", id), data),
    onSuccess: () => {
      toast.success("Проєкт оновлено");
      invalidateAll();
      setEditProject(null);
    },
    onError: () => toast.error("Не вдалося оновити проєкт"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(API_ROUTES.DATA_RECORD("projects", id)),
    onSuccess: () => {
      toast.success("Проєкт видалено");
      if (selectedProjectId === deleteProject?.id) setSelectedProjectId(null);
      invalidateAll();
      setDeleteProject(null);
    },
    onError: () => toast.error("Не вдалося видалити проєкт"),
  });

  const assignMutation = useMutation({
    mutationFn: (txId: number) =>
      apiPost("/api/projects/assign", { transcriptionId: txId, projectId: selectedProjectId }),
    onSuccess: () => {
      toast.success("Транскрипцію додано до проєкту");
      invalidateAll();
    },
    onError: () => toast.error("Не вдалося додати транскрипцію"),
  });

  const unassignMutation = useMutation({
    mutationFn: (txId: number) =>
      apiPost("/api/projects/assign", { transcriptionId: txId, projectId: null }),
    onSuccess: () => {
      toast.success("Транскрипцію видалено з проєкту");
      invalidateAll();
    },
    onError: () => toast.error("Не вдалося видалити транскрипцію з проєкту"),
  });

  const ragSyncMutation = useMutation({
    mutationFn: (projectId: number) =>
      apiPost("/api/rag/sync-project", { projectId, workspaceId: workspaceId || 0 }),
    onSuccess: () => {
      toast.success("RAG базу створено / синхронізовано");
      qc.invalidateQueries({ queryKey: ["rag-bases", workspaceId] });
    },
    onError: () => toast.error("Не вдалося створити RAG базу"),
  });

  // ---- render helpers -------------------------------------------------------

  if (!workspaceId) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ---- render ---------------------------------------------------------------

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Header */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Проєкти</h1>
          <p className="text-muted-foreground text-sm">
            Організуйте транскрипції за проєктами
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Пошук проєктів…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-[220px]"
            />
          </div>

          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Новий проєкт
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Content area: grid + detail panel */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ---------- Projects grid (2/3 or full) ---------- */}
        <div className={selectedProject ? "lg:col-span-2" : "lg:col-span-3"}>
          {projectsQuery.isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : projectsQuery.isError ? (
            <Card>
              <CardContent className="py-12 text-center text-destructive">
                Помилка завантаження проєктів. Спробуйте оновити сторінку.
              </CardContent>
            </Card>
          ) : filteredProjects.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
                {searchQuery
                  ? "Проєктів за запитом не знайдено"
                  : "У вас ще немає проєктів. Створіть перший!"}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredProjects.map((project: any) => {
                const count = transcriptionCountMap.get(project.id) ?? 0;
                const hasRag = ragProjectIds.has(project.id);
                const isSelected = selectedProjectId === project.id;

                return (
                  <Card
                    key={project.id}
                    className={`cursor-pointer transition-shadow hover:shadow-md ${
                      isSelected ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() =>
                      setSelectedProjectId(isSelected ? null : project.id)
                    }
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {colorDot(project.color)}
                          <CardTitle className="text-base truncate">
                            {project.name}
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {hasRag && (
                            <Badge
                              variant="secondary"
                              className="text-xs gap-1"
                            >
                              <Brain className="h-3 w-3" />
                              RAG
                            </Badge>
                          )}
                        </div>
                      </div>
                      {project.description && (
                        <CardDescription className="line-clamp-2 mt-1">
                          {project.description}
                        </CardDescription>
                      )}
                    </CardHeader>

                    <CardFooter className="pt-2 pb-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        {count} {pluralTranscriptions(count)}
                      </span>
                      <span>{formatDate(project.created_at)}</span>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* ---------- Detail panel ---------- */}
        {selectedProject && (
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {colorDot(selectedProject.color)}
                    <CardTitle className="text-lg">
                      {selectedProject.name}
                    </CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditProject(selectedProject);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteProject(selectedProject);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {selectedProject.description && (
                  <CardDescription className="mt-1">
                    {selectedProject.description}
                  </CardDescription>
                )}
              </CardHeader>

              <Separator />

              <CardContent className="pt-4 space-y-4">
                {/* RAG action */}
                {!ragProjectIds.has(selectedProject.id) ? (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    disabled={ragSyncMutation.isPending}
                    onClick={() => ragSyncMutation.mutate(selectedProject.id)}
                  >
                    {ragSyncMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Brain className="h-4 w-4" />
                    )}
                    Створити RAG базу
                  </Button>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <Brain className="h-3 w-3" /> RAG база активна
                  </Badge>
                )}

                {/* Assign transcription */}
                {unassignedTranscriptions.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Додати транскрипцію
                    </Label>
                    <Select
                      onValueChange={(val: any) => assignMutation.mutate(Number(val))}
                      disabled={assignMutation.isPending}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Оберіть транскрипцію…" />
                      </SelectTrigger>
                      <SelectContent>
                        {unassignedTranscriptions.map((t: any) => (
                          <SelectItem key={t.id} value={String(t.id)}>
                            {t.title || `#${t.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* ---- Bulk Upload Section ---- */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    Масове завантаження
                  </Label>

                  <input
                    ref={bulkInputRef}
                    type="file"
                    multiple
                    accept={ACCEPTED_MEDIA_TYPES}
                    className="hidden"
                    onChange={handleBulkFilesSelected}
                  />

                  {bulkFiles.length === 0 ? (
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => bulkInputRef.current?.click()}
                      disabled={bulkUploading}
                    >
                      <Upload className="h-4 w-4" />
                      Обрати аудіо/відео файли
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      {/* Progress summary */}
                      {bulkTotalCount > 0 && (
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>
                            {bulkUploading
                              ? `Завантажено ${bulkDoneCount}/${bulkTotalCount} ${pluralFiles(bulkTotalCount)}`
                              : bulkDoneCount === bulkTotalCount && bulkErrorCount === 0
                              ? `Завантажено ${bulkDoneCount} ${pluralFiles(bulkDoneCount)}`
                              : `Обрано ${bulkTotalCount} ${pluralFiles(bulkTotalCount)}`}
                          </span>
                          {bulkErrorCount > 0 && (
                            <span className="text-destructive text-xs">
                              Помилок: {bulkErrorCount}
                            </span>
                          )}
                        </div>
                      )}

                      {/* File list */}
                      <ul className="space-y-1 max-h-[200px] overflow-y-auto">
                        {bulkFiles.map((item: any, idx: any) => (
                          <li
                            key={idx}
                            className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs"
                          >
                            {item.status === "done" && (
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                            )}
                            {item.status === "error" && (
                              <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                            )}
                            {item.status === "uploading" && (
                              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
                            )}
                            {item.status === "pending" && (
                              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            )}
                            <span className="truncate flex-1">{item.file.name}</span>
                            {item.status === "error" && item.error && (
                              <span className="text-destructive truncate max-w-[100px]" title={item.error}>
                                {item.error}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        {bulkDoneCount < bulkTotalCount && (
                          <Button
                            size="sm"
                            className="flex-1 gap-1"
                            disabled={bulkUploading}
                            onClick={handleBulkUpload}
                          >
                            {bulkUploading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Upload className="h-3.5 w-3.5" />
                            )}
                            {bulkUploading ? "Завантаження…" : "Завантажити"}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={bulkUploading}
                          onClick={handleBulkClear}
                        >
                          Очистити
                        </Button>
                        {!bulkUploading && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => bulkInputRef.current?.click()}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Transcription list */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Транскрипції ({projectTranscriptions.length})
                  </Label>

                  {projectTranscriptionsQuery.isLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : projectTranscriptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      Немає транскрипцій
                    </p>
                  ) : (
                    <ul className="space-y-2 max-h-[400px] overflow-y-auto">
                      {projectTranscriptions.map((tx: any) => (
                        <li
                          key={tx.id}
                          className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="truncate">
                              {tx.title || `Транскрипція #${tx.id}`}
                            </span>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="shrink-0 h-7 w-7"
                            disabled={unassignMutation.isPending}
                            onClick={() => unassignMutation.mutate(tx.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Create Project Dialog */}
      {/* ------------------------------------------------------------------ */}
      <ProjectFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Новий проєкт"
        description="Створіть проєкт для групування транскрипцій"
        isPending={createMutation.isPending}
        onSubmit={(data: any) => createMutation.mutate(data)}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Edit Project Dialog */}
      {/* ------------------------------------------------------------------ */}
      <ProjectFormDialog
        open={!!editProject}
        onOpenChange={(open) => {
          if (!open) setEditProject(null);
        }}
        title="Редагувати проєкт"
        description="Змініть назву, опис або колір проєкту"
        isPending={updateMutation.isPending}
        initial={
          editProject
            ? {
                name: editProject.name,
                description: editProject.description ?? "",
                color: editProject.color ?? DEFAULT_COLOR,
              }
            : undefined
        }
        onSubmit={(data: any) => {
          if (!editProject) return;
          updateMutation.mutate({ id: editProject.id, ...data });
        }}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Delete Confirm Dialog */}
      {/* ------------------------------------------------------------------ */}
      <Dialog
        open={!!deleteProject}
        onOpenChange={(open) => {
          if (!open) setDeleteProject(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Видалити проєкт?</DialogTitle>
            <DialogDescription>
              Проєкт «{deleteProject?.name}» буде видалено. Транскрипції
              залишаться, але втратять прив&apos;язку до цього проєкту. Цю дію
              неможливо скасувати.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline">Скасувати</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteProject) deleteMutation.mutate(deleteProject.id);
              }}
            >
              {deleteMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              )}
              Видалити
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Project Form Dialog (shared between Create & Edit)
// ---------------------------------------------------------------------------

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  isPending: boolean;
  initial?: { name: string; description: string; color: string };
  onSubmit: (data: { name: string; description: string; color: string }) => void;
}

function ProjectFormDialog({
  open,
  onOpenChange,
  title,
  description,
  isPending,
  initial,
  onSubmit,
}: ProjectFormDialogProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [desc, setDesc] = useState(initial?.description ?? "");
  const [color, setColor] = useState(initial?.color ?? DEFAULT_COLOR);

  // Reset fields when dialog opens with new initial values
  const resetKey = initial ? `${initial.name}-${initial.color}` : "new";
  useState(() => {
    setName(initial?.name ?? "");
    setDesc(initial?.description ?? "");
    setColor(initial?.color ?? DEFAULT_COLOR);
  });

  // Sync state when initial changes (for edit)
  const handleOpenChange = (v: boolean) => {
    if (v) {
      setName(initial?.name ?? "");
      setDesc(initial?.description ?? "");
      setColor(initial?.color ?? DEFAULT_COLOR);
    }
    onOpenChange(v);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Назва проєкту обов'язкова");
      return;
    }
    onSubmit({ name: name.trim(), description: desc.trim(), color });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Назва</Label>
              <Input
                id="project-name"
                placeholder="Наприклад: Інтерв'ю Q1 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-desc">Опис</Label>
              <Input
                id="project-desc"
                placeholder="Короткий опис проєкту (необов'язково)"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Колір</Label>
              <div className="flex flex-wrap gap-2">
                {PROJECT_COLORS.map((c: any) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      color === c.value
                        ? "border-foreground scale-110"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: c.value }}
                    onClick={() => setColor(c.value)}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Скасувати
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {initial ? "Зберегти" : "Створити"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Ukrainian pluralization for "транскрипція"
// ---------------------------------------------------------------------------

function pluralTranscriptions(n: number): string {
  const abs = Math.abs(n) % 100;
  const lastDigit = abs % 10;
  if (abs >= 11 && abs <= 19) return "транскрипцій";
  if (lastDigit === 1) return "транскрипція";
  if (lastDigit >= 2 && lastDigit <= 4) return "транскрипції";
  return "транскрипцій";
}

// ---------------------------------------------------------------------------
// Ukrainian pluralization for "файл"
// ---------------------------------------------------------------------------

function pluralFiles(n: number): string {
  const abs = Math.abs(n) % 100;
  const lastDigit = abs % 10;
  if (abs >= 11 && abs <= 19) return "файлів";
  if (lastDigit === 1) return "файл";
  if (lastDigit >= 2 && lastDigit <= 4) return "файли";
  return "файлів";
}
