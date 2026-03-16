"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
  Search,
  Loader2,
} from "lucide-react";
import { AdminGuard } from "@/components/admin/admin-guard";
import { StatusBadge } from "@/components/transcriptions/status-badge";
import * as adminService from "@/services/admin";
import { useWorkspace } from "@/hooks/use-workspace";
import { formatDate, formatBytes } from "@/lib/utils";

function StatsCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function AdminContent() {
  const { workspaceId } = useWorkspace();
  const [tab, setTab] = useState("transcriptions");
  const [searchTx, setSearchTx] = useState("");
  const [searchUsers, setSearchUsers] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  const allTx = txQuery.data?.data ?? [];
  const allUsers = usersQuery.data?.data ?? [];

  const stats = useMemo(() => {
    const total = allTx.length;
    const completed = allTx.filter((t) => t.status === "completed").length;
    const processing = allTx.filter((t) => t.status === "transcribing").length;
    const failed = allTx.filter((t) => t.status === "failed").length;
    return { total, completed, processing, failed, users: allUsers.length };
  }, [allTx, allUsers]);

  const filteredTx = useMemo(() => {
    return allTx.filter((tx) => {
      const matchesSearch =
        !searchTx ||
        tx.original_filename?.toLowerCase().includes(searchTx.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || tx.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [allTx, searchTx, statusFilter]);

  const filteredUsers = useMemo(() => {
    return allUsers.filter((u) => {
      if (!searchUsers) return true;
      const q = searchUsers.toLowerCase();
      return (
        u.email?.toLowerCase().includes(q) ||
        u.name?.toLowerCase().includes(q)
      );
    });
  }, [allUsers, searchUsers]);

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
              <Input
                placeholder="Пошук..."
                value={searchTx}
                onChange={(e) => setSearchTx(e.target.value)}
                className="pl-10 w-full md:w-80"
              />
            </div>
          </div>

          {txQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTx.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        Транскрипції не знайдено
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTx.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-mono text-xs">{tx.id}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {tx.original_filename || "—"}
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
                          {formatDate(tx.created_at)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-4 mt-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Пошук по email або імені..."
              value={searchUsers}
              onChange={(e) => setSearchUsers(e.target.value)}
              className="pl-10"
            />
          </div>

          {usersQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        Користувачів не знайдено
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.name || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.is_active === 1 ? "default" : "destructive"}
                          >
                            {user.is_active === 1 ? "Активний" : "Заблокований"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {formatDate(user.created_at)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
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
