"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  FileText, CheckCircle, Clock, AlertTriangle, Users, Search,
  Loader2, Shield, Trash2, Pencil, Building2, Database,
} from "lucide-react";
import { AdminGuard } from "@/components/admin/admin-guard";
import { StatusBadge } from "@/components/transcriptions/status-badge";
import * as adminService from "@/services/admin";
import { listAllWorkspaces, updateWorkspace } from "@/services/admin";
import { useWorkspace } from "@/hooks/use-workspace";
import { formatDate, formatBytes } from "@/lib/utils";
import { toast } from "sonner";
import type { AppUser, Workspace, Transcription } from "@/types";

// ============ Stats Card ============

function StatsCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent><div className="text-2xl font-bold">{value}</div></CardContent>
    </Card>
  );
}

// ============ Edit User Dialog ============

function EditUserDialog({
  user, open, onClose, onSave, isSaving,
}: {
  user: AppUser | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: { role: string; is_active: number }) => void;
  isSaving: boolean;
}) {
  const [role, setRole] = useState<string>(user?.role || "member");
  const [isActive, setIsActive] = useState(user?.is_active ?? 1);

  // Reset when user changes
  if (user && role !== user.role && !isSaving) {
    setRole(user.role);
    setIsActive(user.is_active);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редагувати користувача</DialogTitle>
          <DialogDescription>{user?.email}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Роль</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Статус</Label>
            <Select value={String(isActive)} onValueChange={(v: any) => setIsActive(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Активний</SelectItem>
                <SelectItem value="0">Заблокований</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Скасувати</Button>
          <Button onClick={() => onSave({ role, is_active: isActive })} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Зберегти
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Edit Workspace Dialog ============

function EditWorkspaceDialog({
  workspace, open, onClose, onSave, isSaving,
}: {
  workspace: Workspace | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Workspace>) => void;
  isSaving: boolean;
}) {
  const [plan, setPlan] = useState<string>(workspace?.plan || "free");
  const [status, setStatus] = useState<string>(workspace?.status || "active");
  const [saladMinutesLimit, setSaladMinutesLimit] = useState(workspace?.salad_minutes_limit ?? 0);
  const [straicoCoinsLimit, setStraicoCoinsLimit] = useState(workspace?.straico_coins_limit ?? 0);
  const [maxTranscriptions, setMaxTranscriptions] = useState(workspace?.max_transcriptions ?? 0);
  const [maxFileSizeMb, setMaxFileSizeMb] = useState(workspace?.max_file_size_mb ?? 0);
  const [maxStorageGb, setMaxStorageGb] = useState(workspace?.max_storage_gb ?? 0);
  const [maxRagBases, setMaxRagBases] = useState(workspace?.max_rag_bases ?? 0);
  const [maxAgents, setMaxAgents] = useState(workspace?.max_agents ?? 0);
  const [maxMembers, setMaxMembers] = useState(workspace?.max_members ?? 0);
  const [defaultSaladMode, setDefaultSaladMode] = useState<string>(workspace?.default_salad_mode || "full");

  // Reset when workspace changes
  useEffect(() => {
    if (workspace) {
      setPlan(workspace.plan || "free");
      setStatus(workspace.status || "active");
      setSaladMinutesLimit(workspace.salad_minutes_limit ?? 0);
      setStraicoCoinsLimit(workspace.straico_coins_limit ?? 0);
      setMaxTranscriptions(workspace.max_transcriptions ?? 0);
      setMaxFileSizeMb(workspace.max_file_size_mb ?? 0);
      setMaxStorageGb(workspace.max_storage_gb ?? 0);
      setMaxRagBases(workspace.max_rag_bases ?? 0);
      setMaxAgents(workspace.max_agents ?? 0);
      setMaxMembers(workspace.max_members ?? 0);
      setDefaultSaladMode(workspace.default_salad_mode || "full");
    }
  }, [workspace]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редагувати воркспейс</DialogTitle>
          <DialogDescription>{workspace?.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Plan */}
          <div className="space-y-2">
            <Label>План</Label>
            <Select value={plan} onValueChange={(v: any) => {
              setPlan(v);
              // Auto-set limits based on plan
              if (v === "free") {
                setSaladMinutesLimit(60); setStraicoCoinsLimit(1000); setMaxTranscriptions(5);
                setMaxFileSizeMb(100); setMaxStorageGb(1); setMaxRagBases(1); setMaxAgents(0); setMaxMembers(1);
              } else if (v === "pro") {
                setSaladMinutesLimit(500); setStraicoCoinsLimit(10000); setMaxTranscriptions(1000);
                setMaxFileSizeMb(3000); setMaxStorageGb(50); setMaxRagBases(10); setMaxAgents(3); setMaxMembers(5);
              } else if (v === "enterprise") {
                setSaladMinutesLimit(15000); setStraicoCoinsLimit(100000); setMaxTranscriptions(99999);
                setMaxFileSizeMb(5000); setMaxStorageGb(500); setMaxRagBases(100); setMaxAgents(50); setMaxMembers(100);
              }
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Статус</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Salad minutes limit */}
          <div className="space-y-2">
            <Label>Salad minutes limit</Label>
            <Input type="number" value={saladMinutesLimit} onChange={(e: any) => setSaladMinutesLimit(Number(e.target.value))} />
          </div>

          {/* Straico coins limit */}
          <div className="space-y-2">
            <Label>Straico coins limit</Label>
            <Input type="number" value={straicoCoinsLimit} onChange={(e: any) => setStraicoCoinsLimit(Number(e.target.value))} />
          </div>

          {/* Max transcriptions */}
          <div className="space-y-2">
            <Label>Max transcriptions</Label>
            <Input type="number" value={maxTranscriptions} onChange={(e: any) => setMaxTranscriptions(Number(e.target.value))} />
          </div>

          {/* Max file size MB */}
          <div className="space-y-2">
            <Label>Max file size (MB)</Label>
            <Input type="number" value={maxFileSizeMb} onChange={(e: any) => setMaxFileSizeMb(Number(e.target.value))} />
          </div>

          {/* Max storage GB */}
          <div className="space-y-2">
            <Label>Max storage (GB)</Label>
            <Input type="number" value={maxStorageGb} onChange={(e: any) => setMaxStorageGb(Number(e.target.value))} />
          </div>

          {/* Max RAG bases */}
          <div className="space-y-2">
            <Label>Max RAG bases</Label>
            <Input type="number" value={maxRagBases} onChange={(e: any) => setMaxRagBases(Number(e.target.value))} />
          </div>

          {/* Max agents */}
          <div className="space-y-2">
            <Label>Max agents</Label>
            <Input type="number" value={maxAgents} onChange={(e: any) => setMaxAgents(Number(e.target.value))} />
          </div>

          {/* Max members */}
          <div className="space-y-2">
            <Label>Max members</Label>
            <Input type="number" value={maxMembers} onChange={(e: any) => setMaxMembers(Number(e.target.value))} />
          </div>

          {/* Default salad mode */}
          <div className="space-y-2">
            <Label>Default salad mode</Label>
            <Select value={defaultSaladMode} onValueChange={setDefaultSaladMode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full</SelectItem>
                <SelectItem value="lite">Lite</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Скасувати</Button>
          <Button
            onClick={() => onSave({
              plan: plan as any,
              status: status as any,
              salad_minutes_limit: saladMinutesLimit,
              straico_coins_limit: straicoCoinsLimit,
              max_transcriptions: maxTranscriptions,
              max_file_size_mb: maxFileSizeMb,
              max_storage_gb: maxStorageGb,
              max_rag_bases: maxRagBases,
              max_agents: maxAgents,
              max_members: maxMembers,
              default_salad_mode: defaultSaladMode as any,
            })}
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Зберегти
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Main Admin Content ============

function AdminContent() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("transcriptions");
  const [searchTx, setSearchTx] = useState("");
  const [searchUsers, setSearchUsers] = useState("");
  const [searchAllUsers, setSearchAllUsers] = useState("");
  const [searchWorkspaces, setSearchWorkspaces] = useState("");
  const [searchRag, setSearchRag] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [editWorkspace, setEditWorkspace] = useState<Workspace | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "user" | "tx" | "rag"; id: number; name: string } | null>(null);

  // Queries — existing
  const txQuery = useQuery({
    queryKey: ["admin-transcriptions", workspaceId],
    queryFn: () => adminService.listAllTranscriptions(workspaceId || 0, { limit: 200 }),
    enabled: !!workspaceId,
  });

  const usersQuery = useQuery({
    queryKey: ["admin-users", workspaceId],
    queryFn: () => adminService.listAllUsers(workspaceId || 0),
    enabled: !!workspaceId,
  });

  const workspacesQuery = useQuery({
    queryKey: ["admin-workspaces"],
    queryFn: () => listAllWorkspaces(),
  });

  // NEW: All users across all workspaces
  const allUsersGlobalQuery = useQuery({
    queryKey: ["admin-all-users-global"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", { credentials: "include" });
      const json = await res.json();
      return Array.isArray(json.data) ? json.data : (json as any)?.data ?? [];
    },
  });

  // NEW: RAG bases
  const ragBasesQuery = useQuery({
    queryKey: ["admin-rag-bases"],
    queryFn: async () => {
      const res = await fetch("/api/admin/rag-bases", { credentials: "include" });
      const json = await res.json();
      return Array.isArray(json.data) ? json.data : (json as any)?.data ?? [];
    },
  });

  // Mutations — existing
  const updateUserMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { role?: string; is_active?: number } }) =>
      adminService.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-users-global"] });
      toast.success("Користувача оновлено");
      setEditUser(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateWorkspaceMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Workspace> }) =>
      updateWorkspace(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-workspaces"] });
      toast.success("Воркспейс оновлено");
      setEditWorkspace(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteUserMut = useMutation({
    mutationFn: (id: number) => adminService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-users-global"] });
      toast.success("Користувача видалено");
      setDeleteConfirm(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteTxMut = useMutation({
    mutationFn: (id: number) => adminService.deleteTranscription(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-transcriptions"] });
      toast.success("Транскрипцію видалено");
      setDeleteConfirm(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  // NEW: Delete RAG base mutation
  const deleteRagMut = useMutation({
    mutationFn: async (ragBaseId: number) => {
      const res = await fetch("/api/admin/rag-bases", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ragBaseId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.error || "Помилка видалення RAG бази");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-rag-bases"] });
      toast.success("RAG базу видалено");
      setDeleteConfirm(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Data unwrapping
  const allTx: any[] = Array.isArray(txQuery.data?.data) ? txQuery.data.data : (txQuery.data as any)?.data ?? [];
  const allUsers: any[] = Array.isArray(usersQuery.data?.data) ? usersQuery.data.data : (usersQuery.data as any)?.data ?? [];
  const allWorkspaces: any[] = Array.isArray(workspacesQuery.data?.data) ? workspacesQuery.data.data : (workspacesQuery.data as any)?.data ?? [];
  const allUsersGlobal: any[] = allUsersGlobalQuery.data ?? [];
  const allRagBases: any[] = ragBasesQuery.data ?? [];

  // Build owner email map for workspaces
  const ownerEmailMap = useMemo(() => {
    const map: Record<number, string> = {};
    allUsersGlobal.forEach((u: any) => {
      if (u.role === "owner" && u.workspace_id) {
        map[u.workspace_id] = u.email || "—";
      }
    });
    return map;
  }, [allUsersGlobal]);

  const stats = useMemo(() => ({
    total: allTx.length,
    completed: allTx.filter((t: any) => t.status === "completed").length,
    processing: allTx.filter((t: any) => t.status === "transcribing").length,
    failed: allTx.filter((t: any) => t.status === "failed").length,
    users: allUsersGlobal.length || allUsers.length,
    workspaces: allWorkspaces.length,
    ragBases: allRagBases.length,
  }), [allTx, allUsers, allUsersGlobal, allWorkspaces, allRagBases]);

  // Filtered lists
  const filteredTx = useMemo(() => allTx.filter((tx: any) => {
    const matchesSearch = !searchTx || tx.original_filename?.toLowerCase().includes(searchTx.toLowerCase());
    const matchesStatus = statusFilter === "all" || tx.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [allTx, searchTx, statusFilter]);

  const filteredUsers = useMemo(() => allUsers.filter((u: any) => {
    if (!searchUsers) return true;
    const q = searchUsers.toLowerCase();
    return u.email?.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q);
  }), [allUsers, searchUsers]);

  const filteredAllUsersGlobal = useMemo(() => allUsersGlobal.filter((u: any) => {
    if (!searchAllUsers) return true;
    const q = searchAllUsers.toLowerCase();
    return u.email?.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q) || u.workspaceName?.toLowerCase().includes(q);
  }), [allUsersGlobal, searchAllUsers]);

  const filteredWorkspaces = useMemo(() => allWorkspaces.filter((w: any) => {
    if (!searchWorkspaces) return true;
    const q = searchWorkspaces.toLowerCase();
    return w.name?.toLowerCase().includes(q) || ownerEmailMap[w.id]?.toLowerCase().includes(q);
  }), [allWorkspaces, searchWorkspaces, ownerEmailMap]);

  const filteredRagBases = useMemo(() => allRagBases.filter((r: any) => {
    if (!searchRag) return true;
    const q = searchRag.toLowerCase();
    return r.name?.toLowerCase().includes(q) || r.ownerEmail?.toLowerCase().includes(q) || r.straico_rag_id?.toLowerCase().includes(q);
  }), [allRagBases, searchRag]);

  const handleDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === "user") deleteUserMut.mutate(deleteConfirm.id);
    else if (deleteConfirm.type === "tx") deleteTxMut.mutate(deleteConfirm.id);
    else if (deleteConfirm.type === "rag") deleteRagMut.mutate(deleteConfirm.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Адміністрування</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={async () => {
            try {
              const res = await fetch("/api/admin/seed-presets-v3", { method: "POST", credentials: "include" });
              const data = await res.json();
              toast.success(`Пресети: ${(data as any).updated || 0} оновлено, ${(data as any).created || 0} створено`);
            } catch { toast.error("Помилка seed"); }
          }}>Seed Presets v3</Button>
          <Button variant="outline" size="sm" onClick={async () => {
            try {
              const res = await fetch("/api/admin/cleanup-presets", { method: "POST", credentials: "include" });
              const data = await res.json();
              toast.success(`Видалено дублів: ${(data as any).duplicatesRemoved || 0}`);
            } catch { toast.error("Помилка cleanup"); }
          }}>Cleanup дублів</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <StatsCard title="Всього транскр." value={stats.total} icon={<FileText className="h-4 w-4 text-muted-foreground" />} />
        <StatsCard title="Завершено" value={stats.completed} icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />} />
        <StatsCard title="В обробці" value={stats.processing} icon={<Clock className="h-4 w-4 text-muted-foreground" />} />
        <StatsCard title="Помилки" value={stats.failed} icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />} />
        <StatsCard title="Користувачів" value={stats.users} icon={<Users className="h-4 w-4 text-muted-foreground" />} />
        <StatsCard title="Воркспейсів" value={stats.workspaces} icon={<Building2 className="h-4 w-4 text-muted-foreground" />} />
        <StatsCard title="RAG баз" value={stats.ragBases} icon={<Database className="h-4 w-4 text-muted-foreground" />} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="transcriptions">Транскрипції</TabsTrigger>
          <TabsTrigger value="all-users">Користувачі</TabsTrigger>
          <TabsTrigger value="workspaces">Воркспейси</TabsTrigger>
          <TabsTrigger value="rag-bases">RAG бази</TabsTrigger>
        </TabsList>

        {/* Transcriptions Tab */}
        <TabsContent value="transcriptions" className="space-y-4 mt-4">
          <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList>
                <TabsTrigger value="all">Всі</TabsTrigger>
                <TabsTrigger value="completed">Завершено</TabsTrigger>
                <TabsTrigger value="transcribing">В обробці</TabsTrigger>
                <TabsTrigger value="failed">Помилки</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Пошук..." value={searchTx} onChange={(e: any) => setSearchTx(e.target.value)} className="pl-10 w-full md:w-80" />
            </div>
          </div>

          {txQuery.isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Файл</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="hidden md:table-cell">Режим</TableHead>
                    <TableHead className="hidden md:table-cell">Розмір</TableHead>
                    <TableHead className="hidden lg:table-cell">Дата</TableHead>
                    <TableHead className="w-[60px]">Дії</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTx.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center">Транскрипції не знайдено</TableCell></TableRow>
                  ) : filteredTx.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-xs">{tx.id}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{tx.original_filename || "—"}</TableCell>
                      <TableCell><StatusBadge status={tx.status} ragStatus={tx.rag_status} /></TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="text-xs">{tx.salad_mode === "lite" ? "Lite" : "Full"}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{formatBytes(tx.file_size_bytes)}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{formatDate(tx.created_at)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteConfirm({ type: "tx", id: tx.id, name: tx.original_filename || `#${tx.id}` })}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* All Users Tab (Global — across all workspaces) */}
        <TabsContent value="all-users" className="space-y-4 mt-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Пошук по email, імені або воркспейсу..." value={searchAllUsers} onChange={(e: any) => setSearchAllUsers(e.target.value)} className="pl-10" />
          </div>

          {allUsersGlobalQuery.isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Ім&apos;я</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead>Воркспейс</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="hidden md:table-cell">Створено</TableHead>
                    <TableHead className="w-[100px]">Дії</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAllUsersGlobal.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center">Користувачів не знайдено</TableCell></TableRow>
                  ) : filteredAllUsersGlobal.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {user.role === "owner" && <Shield className="w-3 h-3 mr-1 inline" />}
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{user.workspaceName || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={user.is_active === 1 ? "default" : "destructive"}>
                          {user.is_active === 1 ? "Активний" : "Заблокований"}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{formatDate(user.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditUser(user)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteConfirm({ type: "user", id: user.id, name: user.email })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Workspaces Tab — with Owner Email column */}
        <TabsContent value="workspaces" className="space-y-4 mt-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Пошук по назві або email власника..." value={searchWorkspaces} onChange={(e: any) => setSearchWorkspaces(e.target.value)} className="pl-10" />
          </div>

          {workspacesQuery.isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Назва</TableHead>
                    <TableHead>Власник</TableHead>
                    <TableHead>План</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="hidden md:table-cell">Учасників</TableHead>
                    <TableHead className="hidden md:table-cell">Salad хв.</TableHead>
                    <TableHead className="hidden lg:table-cell">Straico coins</TableHead>
                    <TableHead className="hidden lg:table-cell">Транскрипцій</TableHead>
                    <TableHead className="w-[60px]">Дії</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWorkspaces.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center">Воркспейси не знайдено</TableCell></TableRow>
                  ) : filteredWorkspaces.map((ws: any) => (
                    <TableRow key={ws.id}>
                      <TableCell className="font-medium">{ws.name || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{ownerEmailMap[ws.id] || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{ws.plan || "free"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={ws.status === "active" ? "default" : "destructive"}>
                          {ws.status === "active" ? "Active" : "Suspended"}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{ws.active_member_count ?? "—"}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {ws.salad_minutes_used ?? 0} / {ws.salad_minutes_limit ?? 0}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {ws.straico_coins_used ?? 0} / {ws.straico_coins_limit ?? 0}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {0} / {ws.max_transcriptions ?? 0}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditWorkspace(ws)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* RAG Bases Tab (NEW) */}
        <TabsContent value="rag-bases" className="space-y-4 mt-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Пошук по назві, email або Straico ID..." value={searchRag} onChange={(e: any) => setSearchRag(e.target.value)} className="pl-10" />
          </div>

          {ragBasesQuery.isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Назва</TableHead>
                    <TableHead>Власник</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="hidden md:table-cell">Straico ID</TableHead>
                    <TableHead className="hidden md:table-cell">Створено</TableHead>
                    <TableHead className="w-[60px]">Дії</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRagBases.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center">RAG бази не знайдено</TableCell></TableRow>
                  ) : filteredRagBases.map((rag: any) => (
                    <TableRow key={rag.id}>
                      <TableCell className="font-medium">{rag.name || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{rag.ownerEmail || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={rag.status === "ready" ? "default" : rag.status === "failed" ? "destructive" : "outline"}>
                          {rag.status || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-xs">{rag.straico_rag_id || "—"}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{formatDate(rag.created_at)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteConfirm({ type: "rag", id: rag.id, name: rag.name || `#${rag.id}` })}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <EditUserDialog
        user={editUser}
        open={!!editUser}
        onClose={() => setEditUser(null)}
        onSave={(data: any) => editUser && updateUserMut.mutate({ id: editUser.id, data })}
        isSaving={updateUserMut.isPending}
      />

      {/* Edit Workspace Dialog */}
      <EditWorkspaceDialog
        workspace={editWorkspace}
        open={!!editWorkspace}
        onClose={() => setEditWorkspace(null)}
        onSave={(data: any) => editWorkspace && updateWorkspaceMut.mutate({ id: editWorkspace.id, data })}
        isSaving={updateWorkspaceMut.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Підтвердити видалення</DialogTitle>
            <DialogDescription>
              Ви впевнені що хочете видалити{" "}
              {deleteConfirm?.type === "user" ? "користувача" : deleteConfirm?.type === "rag" ? "RAG базу" : "транскрипцію"}{" "}
              <strong>{deleteConfirm?.name}</strong>? Цю дію не можна скасувати.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Скасувати</Button>
            <Button variant="destructive" onClick={handleDelete}
              disabled={deleteUserMut.isPending || deleteTxMut.isPending || deleteRagMut.isPending}>
              {(deleteUserMut.isPending || deleteTxMut.isPending || deleteRagMut.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Видалити
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminContent />
    </AdminGuard>
  );
}
