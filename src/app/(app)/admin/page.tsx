"use client";

import { useState, useMemo } from "react";
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
  Loader2, Shield, Ban, Trash2, Pencil,
} from "lucide-react";
import { AdminGuard } from "@/components/admin/admin-guard";
import { StatusBadge } from "@/components/transcriptions/status-badge";
import * as adminService from "@/services/admin";
import { useWorkspace } from "@/hooks/use-workspace";
import { formatDate, formatBytes } from "@/lib/utils";
import { toast } from "sonner";
import type { AppUser } from "@/types";

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
  const [role, setRole] = useState(user?.role || "member");
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
            <Select value={String(isActive)} onValueChange={(v) => setIsActive(Number(v))}>
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

// ============ Main Admin Content ============

function AdminContent() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("transcriptions");
  const [searchTx, setSearchTx] = useState("");
  const [searchUsers, setSearchUsers] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "user" | "tx"; id: number; name: string } | null>(null);

  // Queries
  const txQuery = useQuery({
    queryKey: ["admin-transcriptions", workspaceId],
    queryFn: () => adminService.listAllTranscriptions(workspaceId!, { limit: 200 }),
    enabled: !!workspaceId,
  });

  const usersQuery = useQuery({
    queryKey: ["admin-users", workspaceId],
    queryFn: () => adminService.listAllUsers(workspaceId!),
    enabled: !!workspaceId,
  });

  // Mutations
  const updateUserMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { role?: string; is_active?: number } }) =>
      adminService.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Користувача оновлено");
      setEditUser(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteUserMut = useMutation({
    mutationFn: (id: number) => adminService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
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

  const allTx = txQuery.data?.data ?? [];
  const allUsers = usersQuery.data?.data ?? [];

  const stats = useMemo(() => ({
    total: allTx.length,
    completed: allTx.filter((t) => t.status === "completed").length,
    processing: allTx.filter((t) => t.status === "transcribing").length,
    failed: allTx.filter((t) => t.status === "failed").length,
    users: allUsers.length,
  }), [allTx, allUsers]);

  const filteredTx = useMemo(() => allTx.filter((tx) => {
    const matchesSearch = !searchTx || tx.original_filename?.toLowerCase().includes(searchTx.toLowerCase());
    const matchesStatus = statusFilter === "all" || tx.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [allTx, searchTx, statusFilter]);

  const filteredUsers = useMemo(() => allUsers.filter((u) => {
    if (!searchUsers) return true;
    const q = searchUsers.toLowerCase();
    return u.email?.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q);
  }), [allUsers, searchUsers]);

  const handleDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === "user") deleteUserMut.mutate(deleteConfirm.id);
    else deleteTxMut.mutate(deleteConfirm.id);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Адміністрування</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatsCard title="Всього" value={stats.total} icon={<FileText className="h-4 w-4 text-muted-foreground" />} />
        <StatsCard title="Завершено" value={stats.completed} icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />} />
        <StatsCard title="В обробці" value={stats.processing} icon={<Clock className="h-4 w-4 text-muted-foreground" />} />
        <StatsCard title="Помилки" value={stats.failed} icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />} />
        <StatsCard title="Користувачів" value={stats.users} icon={<Users className="h-4 w-4 text-muted-foreground" />} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="transcriptions">Транскрипції</TabsTrigger>
          <TabsTrigger value="users">Користувачі</TabsTrigger>
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
              <Input placeholder="Пошук..." value={searchTx} onChange={(e) => setSearchTx(e.target.value)} className="pl-10 w-full md:w-80" />
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
                  ) : filteredTx.map((tx) => (
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

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4 mt-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Пошук по email або імені..." value={searchUsers} onChange={(e) => setSearchUsers(e.target.value)} className="pl-10" />
          </div>

          {usersQuery.isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Ім'я</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="hidden md:table-cell">Створено</TableHead>
                    <TableHead className="w-[100px]">Дії</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center">Користувачів не знайдено</TableCell></TableRow>
                  ) : filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {user.role === "owner" && <Shield className="w-3 h-3 mr-1 inline" />}
                          {user.role}
                        </Badge>
                      </TableCell>
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
      </Tabs>

      {/* Edit User Dialog */}
      <EditUserDialog
        user={editUser}
        open={!!editUser}
        onClose={() => setEditUser(null)}
        onSave={(data) => editUser && updateUserMut.mutate({ id: editUser.id, data })}
        isSaving={updateUserMut.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Підтвердити видалення</DialogTitle>
            <DialogDescription>
              Ви впевнені що хочете видалити {deleteConfirm?.type === "user" ? "користувача" : "транскрипцію"}{" "}
              <strong>{deleteConfirm?.name}</strong>? Цю дію не можна скасувати.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Скасувати</Button>
            <Button variant="destructive" onClick={handleDelete}
              disabled={deleteUserMut.isPending || deleteTxMut.isPending}>
              {(deleteUserMut.isPending || deleteTxMut.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
