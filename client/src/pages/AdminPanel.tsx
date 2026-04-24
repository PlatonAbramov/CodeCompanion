import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserSchema, type CreateUser, type User, type AdminAction, type LoginAttempt } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import {
  Users, UserPlus, Shield, ShieldOff, RotateCcw, LogOut,
  Activity, Search, AlertTriangle, CheckCircle, XCircle,
  Clock, Edit, Trash2
} from "lucide-react";
import { CorpHeader, fmtDateRu } from "@/components/corp-ui";

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  activeSessions: number;
  failedLoginsToday: number;
}

const SECTION_STYLE: React.CSSProperties = {
  background: 'var(--corp-surface)',
  border: '1px solid var(--corp-line)',
  borderRadius: 'var(--corp-r-lg)',
};

const PRIMARY_BTN: React.CSSProperties = {
  background: 'var(--corp-accent)',
  color: '#fff',
  borderRadius: 'var(--corp-r)',
};
const GHOST_BTN: React.CSSProperties = {
  background: 'var(--corp-surface-2)',
  color: 'var(--corp-ink-2)',
  borderRadius: 'var(--corp-r)',
};
const DANGER_BTN: React.CSSProperties = {
  background: 'var(--corp-neg)',
  color: '#fff',
  borderRadius: 'var(--corp-r)',
};

function StatCard({
  label, value, icon, tone = 'ink',
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone?: 'ink' | 'pos' | 'neg' | 'warn' | 'accent';
}) {
  const color =
    tone === 'pos' ? 'var(--corp-pos)' :
    tone === 'neg' ? 'var(--corp-neg)' :
    tone === 'warn' ? '#f59e0b' :
    tone === 'accent' ? 'var(--corp-accent)' :
    'var(--corp-ink)';
  return (
    <div className="p-4" style={SECTION_STYLE}>
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--corp-surface-2)', color }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[20px] font-bold leading-tight" style={{ color: 'var(--corp-ink)', fontFamily: 'var(--corp-mono)' }}>
            {value}
          </p>
          <p className="text-[11px] truncate" style={{ color: 'var(--corp-muted)' }}>{label}</p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'pos' | 'neg' | 'warn' | 'accent' | 'neutral' }) {
  const cfg =
    tone === 'pos' ? { bg: 'rgba(22,163,74,0.10)', color: 'var(--corp-pos)' } :
    tone === 'neg' ? { bg: 'rgba(220,38,38,0.10)', color: 'var(--corp-neg)' } :
    tone === 'warn' ? { bg: 'rgba(245,158,11,0.10)', color: '#f59e0b' } :
    tone === 'accent' ? { bg: 'rgba(37,99,235,0.10)', color: 'var(--corp-accent)' } :
    { bg: 'var(--corp-surface-2)', color: 'var(--corp-ink-3)' };
  return (
    <span
      className="inline-flex items-center px-2 h-5 text-[10px] font-bold uppercase whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color, borderRadius: 'var(--corp-r-sm)', letterSpacing: '0.04em' }}
    >
      {children}
    </span>
  );
}

export default function AdminPanel() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "blocked">("all");
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isSetPasswordOpen, setIsSetPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isAdmin = user?.role === "admin";

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    queryFn: async () => {
      const res = await apiRequest('/api/admin/stats');
      return res.json();
    },
    enabled: isAdmin,
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users', searchTerm, filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      const res = await apiRequest(`/api/admin/users?${params}`);
      return res.json();
    },
    enabled: isAdmin,
  });

  const { data: adminActions } = useQuery<AdminAction[]>({
    queryKey: ['/api/admin/actions'],
    queryFn: async () => {
      const res = await apiRequest('/api/admin/actions');
      return res.json();
    },
    enabled: isAdmin,
  });

  const { data: loginAttempts } = useQuery<LoginAttempt[]>({
    queryKey: ['/api/admin/login-attempts'],
    queryFn: async () => {
      const res = await apiRequest('/api/admin/login-attempts');
      return res.json();
    },
    enabled: isAdmin,
  });

  const createUserForm = useForm<CreateUser>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { username: "", name: "", password: "", role: "master" },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUser) => {
      const res = await apiRequest('/api/admin/users', { method: 'POST', body: JSON.stringify(data) });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Успешно", description: "Пользователь создан успешно" });
      setIsCreateUserOpen(false);
      createUserForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message || "Не удалось создать пользователя", variant: "destructive" });
    },
  });

  const toggleUserBlockMutation = useMutation({
    mutationFn: async ({ userId, blocked }: { userId: string; blocked: boolean }) => {
      const res = await apiRequest(`/api/admin/users/${userId}/block`, { method: 'PATCH', body: JSON.stringify({ blocked }) });
      return res.json();
    },
    onSuccess: (_, { blocked }) => {
      toast({ title: "Успешно", description: blocked ? "Пользователь заблокирован" : "Пользователь разблокирован" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message || "Не удалось изменить статус пользователя", variant: "destructive" });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest(`/api/admin/users/${userId}/reset-password`, { method: 'POST' });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Пароль сброшен", description: `Новый временный пароль: ${data.tempPassword}` });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message || "Не удалось сбросить пароль", variant: "destructive" });
    },
  });

  const forceLogoutMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest(`/api/admin/users/${userId}/force-logout`, { method: 'POST' });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Успешно", description: "Пользователь принудительно вышел из всех сессий" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setIsEditUserOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message || "Не удалось завершить сессии", variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest(`/api/admin/users/${userId}`, { method: 'DELETE' });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Успешно", description: "Пользователь удален" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setIsEditUserOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message || "Не удалось удалить пользователя", variant: "destructive" });
    },
  });

  const setPasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      const res = await apiRequest(`/api/admin/users/${userId}/set-password`, { method: 'POST', body: JSON.stringify({ password }) });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Успешно", description: "Пароль установлен" });
      setIsSetPasswordOpen(false);
      setNewPassword("");
      setIsEditUserOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message || "Не удалось установить пароль", variant: "destructive" });
    },
  });

  const onCreateUser = (data: CreateUser) => {
    createUserMutation.mutate(data);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--corp-bg)' }}>
        <div className="w-full max-w-md p-8 text-center" style={SECTION_STYLE}>
          <XCircle className="h-14 w-14 mx-auto mb-3" style={{ color: 'var(--corp-neg)' }} />
          <h2 className="text-[16px] font-bold mb-2" style={{ color: 'var(--corp-ink)' }}>Нет доступа</h2>
          <p className="text-[13px]" style={{ color: 'var(--corp-muted)' }}>У вас нет прав для доступа к админ-панели.</p>
        </div>
      </div>
    );
  }

  const filteredUsers = users?.filter(u => {
    const matchesSearch = !searchTerm ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' ||
      (filterStatus === 'active' && u.isActive && !u.isBlocked) ||
      (filterStatus === 'blocked' && u.isBlocked);
    return matchesSearch && matchesFilter;
  });

  const getRoleLabel = (role: string) =>
    role === 'admin' ? 'Администратор' :
    role === 'director' ? 'Директор' :
    role === 'master' ? 'Прораб' : 'Заказчик';

  const getRoleTone = (role: string): 'neg' | 'accent' | 'neutral' =>
    role === 'admin' ? 'neg' :
    role === 'director' ? 'accent' : 'neutral';

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--corp-bg)' }} data-page-header>
      <CorpHeader
        title="Админ-панель"
        subtitle="Управление пользователями и системой"
        onBack={() => setLocation('/director')}
        action={<StatusBadge tone="neg">Администратор</StatusBadge>}
      />

      <div className="p-4 space-y-4">
        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard label="Всего пользователей" value={stats.totalUsers} icon={<Users className="h-5 w-5" />} tone="accent" />
            <StatCard label="Активные" value={stats.activeUsers} icon={<CheckCircle className="h-5 w-5" />} tone="pos" />
            <StatCard label="Заблокированные" value={stats.blockedUsers} icon={<XCircle className="h-5 w-5" />} tone="neg" />
            <StatCard label="Активные сессии" value={stats.activeSessions} icon={<Activity className="h-5 w-5" />} tone="pos" />
            <StatCard label="Ошибки входа сегодня" value={stats.failedLoginsToday} icon={<AlertTriangle className="h-5 w-5" />} tone="warn" />
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Пользователи</TabsTrigger>
            <TabsTrigger value="actions">Журнал действий</TabsTrigger>
            <TabsTrigger value="logins">Логи входов</TabsTrigger>
          </TabsList>

          {/* Users tab */}
          <TabsContent value="users" className="space-y-4">
            <div className="p-4" style={SECTION_STYLE}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-[14px] font-bold" style={{ color: 'var(--corp-ink)' }}>Управление пользователями</h3>
                  <p className="text-[12px]" style={{ color: 'var(--corp-muted)' }}>
                    Создание, редактирование и управление пользователями
                  </p>
                </div>

                <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 h-9 px-3 text-[12px] font-semibold transition-colors flex-shrink-0"
                      style={PRIMARY_BTN}
                      data-testid="button-create-user"
                    >
                      <UserPlus className="h-4 w-4" />
                      Создать пользователя
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Создать нового пользователя</DialogTitle>
                      <DialogDescription>Заполните форму для создания нового пользователя</DialogDescription>
                    </DialogHeader>

                    <Form {...createUserForm}>
                      <form onSubmit={createUserForm.handleSubmit(onCreateUser)} className="space-y-4">
                        <FormField
                          control={createUserForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Логин</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-username" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createUserForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Имя</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createUserForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Пароль</FormLabel>
                              <FormControl>
                                <Input {...field} type="password" data-testid="input-password" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createUserForm.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Роль</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-role">
                                    <SelectValue placeholder="Выберите роль" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="master">Прораб</SelectItem>
                                  <SelectItem value="director">Директор</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setIsCreateUserOpen(false)}
                            className="flex-1 h-10 text-[13px] font-semibold transition-colors"
                            style={GHOST_BTN}
                            data-testid="button-cancel"
                          >
                            Отмена
                          </button>
                          <button
                            type="submit"
                            disabled={createUserMutation.isPending}
                            className="flex-1 h-10 text-[13px] font-semibold transition-colors disabled:opacity-50"
                            style={PRIMARY_BTN}
                            data-testid="button-submit"
                          >
                            {createUserMutation.isPending ? "Создание..." : "Создать"}
                          </button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Search & filter */}
              <div className="flex flex-col md:flex-row gap-3 mb-4">
                <div className="flex-1 relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                    style={{ color: 'var(--corp-ink-3)' }}
                  />
                  <Input
                    placeholder="Поиск по логину, имени или email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-10"
                    data-testid="input-search"
                  />
                </div>

                <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                  <SelectTrigger className="w-full md:w-[180px] h-10" data-testid="select-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все пользователи</SelectItem>
                    <SelectItem value="active">Активные</SelectItem>
                    <SelectItem value="blocked">Заблокированные</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Users table */}
              <div style={{ borderRadius: 'var(--corp-r)', border: '1px solid var(--corp-line)', overflow: 'hidden' }}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Пользователь</TableHead>
                      <TableHead>Роль</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Последний вход</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8" style={{ color: 'var(--corp-muted)' }}>
                          Загрузка...
                        </TableCell>
                      </TableRow>
                    ) : filteredUsers && filteredUsers.length > 0 ? (
                      filteredUsers.map((u) => (
                        <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                          <TableCell>
                            <div>
                              <div className="font-semibold text-[13px]" style={{ color: 'var(--corp-ink)' }}>{u.name}</div>
                              <div className="text-[11px]" style={{ color: 'var(--corp-muted)', fontFamily: 'var(--corp-mono)' }}>@{u.username}</div>
                              {u.email && (
                                <div className="text-[11px]" style={{ color: 'var(--corp-muted)' }}>{u.email}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge tone={getRoleTone(u.role)}>{getRoleLabel(u.role)}</StatusBadge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 items-start">
                              <StatusBadge tone={u.isActive && !u.isBlocked ? 'pos' : 'neg'}>
                                {u.isBlocked ? 'Заблокирован' : u.isActive ? 'Активен' : 'Неактивен'}
                              </StatusBadge>
                              {u.mustChangePassword && (
                                <StatusBadge tone="warn">Смена пароля</StatusBadge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {u.lastLogin ? (
                              <span className="text-[12px]" style={{ color: 'var(--corp-ink-2)', fontFamily: 'var(--corp-mono)' }}>
                                {new Date(u.lastLogin).toLocaleString('ru-RU')}
                              </span>
                            ) : (
                              <span className="text-[12px]" style={{ color: 'var(--corp-muted)' }}>Никогда</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingUser(u);
                                setIsEditUserOpen(true);
                              }}
                              className="inline-flex items-center gap-1 h-8 px-3 text-[11px] font-semibold transition-colors"
                              style={GHOST_BTN}
                              data-testid={`button-edit-user-${u.id}`}
                            >
                              <Edit className="h-3 w-3" />
                              Редактировать
                            </button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8" style={{ color: 'var(--corp-muted)' }}>
                          {searchTerm || filterStatus !== 'all'
                            ? "Пользователи не найдены"
                            : "Пока нет пользователей"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Actions log tab */}
          <TabsContent value="actions">
            <div className="p-4" style={SECTION_STYLE}>
              <div className="mb-4">
                <h3 className="text-[14px] font-bold" style={{ color: 'var(--corp-ink)' }}>Журнал действий администратора</h3>
                <p className="text-[12px]" style={{ color: 'var(--corp-muted)' }}>История всех действий в админ-панели</p>
              </div>
              <div style={{ borderRadius: 'var(--corp-r)', border: '1px solid var(--corp-line)', overflow: 'hidden' }}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата и время</TableHead>
                      <TableHead>Действие</TableHead>
                      <TableHead>Пользователь</TableHead>
                      <TableHead>Детали</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminActions && adminActions.length > 0 ? (
                      adminActions.map((action) => (
                        <TableRow key={action.id} data-testid={`row-action-${action.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--corp-ink-2)', fontFamily: 'var(--corp-mono)' }}>
                              <Clock className="h-3.5 w-3.5" style={{ color: 'var(--corp-ink-3)' }} />
                              {action.createdAt ? new Date(action.createdAt).toLocaleString('ru-RU') : '—'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge tone="accent">{action.action}</StatusBadge>
                          </TableCell>
                          <TableCell>
                            {action.targetUserId ? (
                              <span className="text-[12px]" style={{ color: 'var(--corp-ink-2)', fontFamily: 'var(--corp-mono)' }}>
                                {action.targetUserId}
                              </span>
                            ) : (
                              <span className="text-[12px]" style={{ color: 'var(--corp-muted)' }}>—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {action.details ? (
                              <pre className="text-[10px]" style={{ fontFamily: 'var(--corp-mono)', color: 'var(--corp-ink-3)' }}>
                                {JSON.stringify(action.details, null, 2)}
                              </pre>
                            ) : (
                              <span className="text-[12px]" style={{ color: 'var(--corp-muted)' }}>—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8" style={{ color: 'var(--corp-muted)' }}>
                          Пока нет событий
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Logins log tab */}
          <TabsContent value="logins">
            <div className="p-4" style={SECTION_STYLE}>
              <div className="mb-4">
                <h3 className="text-[14px] font-bold" style={{ color: 'var(--corp-ink)' }}>Логи входов в систему</h3>
                <p className="text-[12px]" style={{ color: 'var(--corp-muted)' }}>История попыток входа и ошибок</p>
              </div>
              <div style={{ borderRadius: 'var(--corp-r)', border: '1px solid var(--corp-line)', overflow: 'hidden' }}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата и время</TableHead>
                      <TableHead>Пользователь</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>IP адрес</TableHead>
                      <TableHead>Браузер</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loginAttempts && loginAttempts.length > 0 ? (
                      loginAttempts.map((attempt) => (
                        <TableRow key={attempt.id} data-testid={`row-login-${attempt.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--corp-ink-2)', fontFamily: 'var(--corp-mono)' }}>
                              <Clock className="h-3.5 w-3.5" style={{ color: 'var(--corp-ink-3)' }} />
                              {attempt.attemptTime ? new Date(attempt.attemptTime).toLocaleString('ru-RU') : '—'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              {attempt.username && (
                                <div className="text-[12px] font-semibold" style={{ color: 'var(--corp-ink)', fontFamily: 'var(--corp-mono)' }}>
                                  @{attempt.username}
                                </div>
                              )}
                              {attempt.email && (
                                <div className="text-[11px]" style={{ color: 'var(--corp-muted)' }}>{attempt.email}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge tone={attempt.success ? 'pos' : 'neg'}>
                              {attempt.success ? (
                                <><CheckCircle className="h-2.5 w-2.5 mr-1" />Успешно</>
                              ) : (
                                <><XCircle className="h-2.5 w-2.5 mr-1" />Ошибка</>
                              )}
                            </StatusBadge>
                            {!attempt.success && attempt.failureReason && (
                              <div className="text-[10px] mt-1" style={{ color: 'var(--corp-muted)' }}>{attempt.failureReason}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-[12px]" style={{ color: 'var(--corp-ink-2)', fontFamily: 'var(--corp-mono)' }}>
                              {attempt.ipAddress || '—'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-[10px]" style={{ color: 'var(--corp-muted)' }}>
                              {attempt.userAgent ? attempt.userAgent.substring(0, 50) + '...' : '—'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8" style={{ color: 'var(--corp-muted)' }}>
                          Пока нет попыток входа
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit user modal */}
        <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Редактирование пользователя</DialogTitle>
              <DialogDescription>
                Управление учетной записью: {editingUser?.name} (@{editingUser?.username})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (editingUser) {
                      toggleUserBlockMutation.mutate({ userId: editingUser.id, blocked: !editingUser.isBlocked });
                    }
                  }}
                  disabled={toggleUserBlockMutation.isPending}
                  className="inline-flex items-center justify-center gap-2 h-10 text-[12px] font-semibold transition-colors disabled:opacity-50"
                  style={editingUser?.isBlocked ? PRIMARY_BTN : DANGER_BTN}
                  data-testid="button-edit-toggle-block"
                >
                  {editingUser?.isBlocked ? (
                    <><Shield className="h-4 w-4" />Разблокировать</>
                  ) : (
                    <><ShieldOff className="h-4 w-4" />Заблокировать</>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { if (editingUser) resetPasswordMutation.mutate(editingUser.id); }}
                  disabled={resetPasswordMutation.isPending}
                  className="inline-flex items-center justify-center gap-2 h-10 text-[12px] font-semibold transition-colors disabled:opacity-50"
                  style={GHOST_BTN}
                  data-testid="button-edit-reset-password"
                >
                  <RotateCcw className="h-4 w-4" />
                  Сбросить пароль
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsSetPasswordOpen(true)}
                className="w-full inline-flex items-center justify-center gap-2 h-10 text-[12px] font-semibold transition-colors"
                style={GHOST_BTN}
                data-testid="button-edit-set-password"
              >
                <Edit className="h-4 w-4" />
                Установить пароль
              </button>

              <button
                type="button"
                onClick={() => { if (editingUser) forceLogoutMutation.mutate(editingUser.id); }}
                disabled={forceLogoutMutation.isPending}
                className="w-full inline-flex items-center justify-center gap-2 h-10 text-[12px] font-semibold transition-colors disabled:opacity-50"
                style={GHOST_BTN}
                data-testid="button-edit-force-logout"
              >
                <LogOut className="h-4 w-4" />
                Выйти везде
              </button>

              <div style={{ borderTop: '1px solid var(--corp-line)', paddingTop: 12 }}>
                <button
                  type="button"
                  onClick={() => {
                    if (editingUser && confirm(`Вы уверены, что хотите удалить пользователя ${editingUser.name}? Это действие нельзя отменить.`)) {
                      deleteUserMutation.mutate(editingUser.id);
                    }
                  }}
                  disabled={deleteUserMutation.isPending}
                  className="w-full inline-flex items-center justify-center gap-2 h-10 text-[12px] font-semibold transition-colors disabled:opacity-50"
                  style={DANGER_BTN}
                  data-testid="button-edit-delete-user"
                >
                  <Trash2 className="h-4 w-4" />
                  Удалить пользователя
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsEditUserOpen(false)}
                className="inline-flex items-center justify-center h-10 px-4 text-[13px] font-semibold transition-colors"
                style={GHOST_BTN}
                data-testid="button-cancel-edit"
              >
                Отмена
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Set password modal */}
        <Dialog open={isSetPasswordOpen} onOpenChange={setIsSetPasswordOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Установить пароль</DialogTitle>
              <DialogDescription>
                Установить новый пароль для пользователя: {editingUser?.name} (@{editingUser?.username})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <Label htmlFor="new-password">Новый пароль</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Введите новый пароль"
                  data-testid="input-new-password"
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setIsSetPasswordOpen(false); setNewPassword(""); }}
                className="flex-1 h-10 text-[13px] font-semibold transition-colors"
                style={GHOST_BTN}
                data-testid="button-cancel-password"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  if (editingUser && newPassword.trim()) {
                    setPasswordMutation.mutate({ userId: editingUser.id, password: newPassword.trim() });
                  }
                }}
                disabled={setPasswordMutation.isPending || !newPassword.trim()}
                className="flex-1 h-10 text-[13px] font-semibold transition-colors disabled:opacity-50"
                style={PRIMARY_BTN}
                data-testid="button-submit-password"
              >
                {setPasswordMutation.isPending ? "Установка..." : "Установить"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
