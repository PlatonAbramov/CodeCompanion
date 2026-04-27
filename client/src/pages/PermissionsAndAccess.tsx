import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShieldCheck, RotateCcw, Save, Search, History as HistoryIcon, ArrowLeft } from "lucide-react";

interface RegistryPermission {
  key: string;
  category: string;
  name: string;
  description: string;
  defaults: Record<string, boolean>;
}
interface Registry {
  roles: { key: string; label: string }[];
  categories: { key: string; label: string }[];
  permissions: RegistryPermission[];
}
interface RoleConfig { role: string; label: string; values: Record<string, boolean> }
interface UserPermItem {
  key: string;
  roleValue: boolean;
  override: "enabled" | "disabled" | null;
  effective: boolean;
}
interface UserPermResponse {
  user: { id: string; name: string; username: string; role: string };
  items: UserPermItem[];
}
interface AuditEntry {
  id: string;
  changedAt: string;
  actor: { id: string; name: string; username: string } | null;
  scope: "role" | "user";
  scopeId: string;
  scopeLabel: string;
  permissionKey: string;
  permissionName: string;
  prevValue: string | null;
  newValue: string;
}

function valueLabel(v: string | null): string {
  switch (v) {
    case "enabled": return "Включено";
    case "disabled": return "Выключено";
    case "inherit": return "По умолчанию";
    default: return "—";
  }
}

export default function PermissionsAndAccess() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  // ===== Registry =====
  const { data: registry, isLoading: regLoading } = useQuery<Registry>({
    queryKey: ["/api/permissions/registry"],
    enabled: user?.role === "admin",
  });

  const groupedPermissions = useMemo(() => {
    if (!registry) return [] as Array<{ category: { key: string; label: string }; perms: RegistryPermission[] }>;
    const byCat = new Map<string, RegistryPermission[]>();
    for (const p of registry.permissions) {
      if (!byCat.has(p.category)) byCat.set(p.category, []);
      byCat.get(p.category)!.push(p);
    }
    return registry.categories
      .filter((c) => byCat.has(c.key))
      .map((c) => ({ category: c, perms: byCat.get(c.key)! }));
  }, [registry]);

  // ===== Tab "По ролям" =====
  const [selectedRole, setSelectedRole] = useState<string>("master");
  const { data: roleConfig, isLoading: roleLoading } = useQuery<RoleConfig>({
    queryKey: ["/api/permissions/role", selectedRole],
    enabled: user?.role === "admin" && !!selectedRole,
  });

  const [draftRole, setDraftRole] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (roleConfig) setDraftRole({ ...roleConfig.values });
  }, [roleConfig]);

  const roleDirty = useMemo(() => {
    if (!roleConfig) return [];
    return Object.entries(draftRole).filter(([k, v]) => roleConfig.values[k] !== v);
  }, [draftRole, roleConfig]);

  const [confirmRoleSaveOpen, setConfirmRoleSaveOpen] = useState(false);
  const [confirmRoleResetOpen, setConfirmRoleResetOpen] = useState(false);

  const saveRoleMut = useMutation({
    mutationFn: async () => {
      const updates = roleDirty.map(([key, enabled]) => ({ key, enabled }));
      return apiRequest(`/api/permissions/role/${selectedRole}`, {
        method: "PUT",
        body: JSON.stringify({ updates }),
      });
    },
    onSuccess: () => {
      toast({ title: "Сохранено", description: `Изменено прав: ${roleDirty.length}` });
      qc.invalidateQueries({ queryKey: ["/api/permissions/role", selectedRole] });
      qc.invalidateQueries({ queryKey: ["/api/permissions/audit"] });
      qc.invalidateQueries({ queryKey: ["/api/permissions/me"] });
    },
    onError: (e: any) => toast({ title: "Ошибка", description: String(e?.message ?? e), variant: "destructive" }),
  });

  const resetRoleMut = useMutation({
    mutationFn: async () => apiRequest(`/api/permissions/role/${selectedRole}/reset`, { method: "POST" }),
    onSuccess: () => {
      toast({ title: "Сброшено к значениям по умолчанию" });
      qc.invalidateQueries({ queryKey: ["/api/permissions/role", selectedRole] });
      qc.invalidateQueries({ queryKey: ["/api/permissions/audit"] });
      qc.invalidateQueries({ queryKey: ["/api/permissions/me"] });
    },
    onError: (e: any) => toast({ title: "Ошибка", description: String(e?.message ?? e), variant: "destructive" }),
  });

  // ===== Tab "По сотрудникам" =====
  const { data: allUsers } = useQuery<Array<{ id: string; name: string; username: string; role: string; isActive?: boolean }>>({
    queryKey: ["/api/users"],
    enabled: user?.role === "admin",
  });

  const [userQuery, setUserQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const list = allUsers ?? [];
    const q = userQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((u) =>
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q));
  }, [allUsers, userQuery]);

  const { data: userPerms, isLoading: userPermsLoading } = useQuery<UserPermResponse>({
    queryKey: ["/api/permissions/user", selectedUserId],
    enabled: user?.role === "admin" && !!selectedUserId,
  });

  // draft state for user overrides: key -> 'enabled' | 'disabled' | null
  const [draftUser, setDraftUser] = useState<Record<string, "enabled" | "disabled" | null>>({});
  useEffect(() => {
    if (userPerms) {
      const m: Record<string, "enabled" | "disabled" | null> = {};
      for (const it of userPerms.items) m[it.key] = it.override;
      setDraftUser(m);
    }
  }, [userPerms]);

  const userDirty = useMemo(() => {
    if (!userPerms) return [] as Array<[string, "enabled" | "disabled" | null]>;
    const orig = new Map(userPerms.items.map((it) => [it.key, it.override]));
    return Object.entries(draftUser).filter(([k, v]) => orig.get(k) !== v) as Array<[string, "enabled" | "disabled" | null]>;
  }, [draftUser, userPerms]);

  const [confirmUserSaveOpen, setConfirmUserSaveOpen] = useState(false);
  const [confirmUserResetOpen, setConfirmUserResetOpen] = useState(false);

  const saveUserMut = useMutation({
    mutationFn: async () => {
      const updates = userDirty.map(([key, state]) => ({ key, state }));
      return apiRequest(`/api/permissions/user/${selectedUserId}`, {
        method: "PUT",
        body: JSON.stringify({ updates }),
      });
    },
    onSuccess: () => {
      toast({ title: "Сохранено", description: `Изменено прав: ${userDirty.length}` });
      qc.invalidateQueries({ queryKey: ["/api/permissions/user", selectedUserId] });
      qc.invalidateQueries({ queryKey: ["/api/permissions/audit"] });
      qc.invalidateQueries({ queryKey: ["/api/permissions/me"] });
    },
    onError: (e: any) => toast({ title: "Ошибка", description: String(e?.message ?? e), variant: "destructive" }),
  });

  const resetUserMut = useMutation({
    mutationFn: async () => apiRequest(`/api/permissions/user/${selectedUserId}/reset`, { method: "POST" }),
    onSuccess: () => {
      toast({ title: "Персональные настройки сброшены" });
      qc.invalidateQueries({ queryKey: ["/api/permissions/user", selectedUserId] });
      qc.invalidateQueries({ queryKey: ["/api/permissions/audit"] });
      qc.invalidateQueries({ queryKey: ["/api/permissions/me"] });
    },
    onError: (e: any) => toast({ title: "Ошибка", description: String(e?.message ?? e), variant: "destructive" }),
  });

  // ===== Tab "Журнал" =====
  const { data: auditEntries } = useQuery<AuditEntry[]>({
    queryKey: ["/api/permissions/audit"],
    enabled: user?.role === "admin",
  });

  if (user?.role !== "admin") {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold mb-2">Доступ запрещён</h1>
        <p className="text-slate-600">Раздел доступен только администратору.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto" data-testid="page-permissions-and-access">
      <div className="flex items-center gap-3 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/admin")}
          data-testid="button-back-to-admin"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          К админ-панели
        </Button>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-slate-600" />
          <h1 className="text-xl sm:text-2xl font-semibold">Права и доступ</h1>
        </div>
      </div>

      <p className="text-sm text-slate-600 mb-4">
        Гибкая настройка прав по ролям и индивидуальные переопределения для сотрудников.
        По умолчанию каждая роль имеет тот же набор прав, что и до внедрения этой страницы.
      </p>

      <Tabs defaultValue="by-role" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="by-role" data-testid="tab-by-role">По ролям</TabsTrigger>
          <TabsTrigger value="by-user" data-testid="tab-by-user">По сотрудникам</TabsTrigger>
          <TabsTrigger value="audit" data-testid="tab-audit">
            <HistoryIcon className="w-4 h-4 mr-1" />
            Журнал
          </TabsTrigger>
        </TabsList>

        {/* ===================== По ролям ===================== */}
        <TabsContent value="by-role">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3 flex-wrap">
                <span>Настройки роли</span>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-[180px]" data-testid="select-role">
                    <SelectValue placeholder="Выберите роль" />
                  </SelectTrigger>
                  <SelectContent>
                    {(registry?.roles ?? []).map((r) => (
                      <SelectItem key={r.key} value={r.key} data-testid={`option-role-${r.key}`}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(regLoading || roleLoading) ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <>
                  <div className="space-y-6">
                    {groupedPermissions.map(({ category, perms }) => (
                      <div key={category.key}>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                            {category.label}
                          </h3>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const next = { ...draftRole };
                                for (const p of perms) next[p.key] = true;
                                setDraftRole(next);
                              }}
                              data-testid={`button-enable-all-${category.key}`}
                            >
                              Включить все
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const next = { ...draftRole };
                                for (const p of perms) next[p.key] = false;
                                setDraftRole(next);
                              }}
                              data-testid={`button-disable-all-${category.key}`}
                            >
                              Выключить все
                            </Button>
                          </div>
                        </div>
                        <div className="divide-y border rounded-md">
                          {perms.map((p) => {
                            const v = draftRole[p.key] ?? false;
                            return (
                              <div key={p.key} className="flex items-start justify-between gap-4 p-3">
                                <div className="min-w-0">
                                  <div className="font-medium text-sm">{p.name}</div>
                                  <div className="text-xs text-slate-500">{p.description}</div>
                                </div>
                                <Switch
                                  checked={v}
                                  onCheckedChange={(checked) =>
                                    setDraftRole((s) => ({ ...s, [p.key]: !!checked }))
                                  }
                                  data-testid={`switch-role-${p.key}`}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-sm text-slate-600">
                      {roleDirty.length > 0
                        ? <>Несохранённых изменений: <b>{roleDirty.length}</b></>
                        : "Изменений нет"}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setConfirmRoleResetOpen(true)}
                        disabled={resetRoleMut.isPending}
                        data-testid="button-reset-role"
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Сбросить к дефолту
                      </Button>
                      <Button
                        onClick={() => setConfirmRoleSaveOpen(true)}
                        disabled={roleDirty.length === 0 || saveRoleMut.isPending}
                        data-testid="button-save-role"
                      >
                        <Save className="w-4 h-4 mr-1" />
                        Сохранить
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== По сотрудникам ===================== */}
        <TabsContent value="by-user">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-1">
              <CardHeader><CardTitle>Сотрудники</CardTitle></CardHeader>
              <CardContent>
                <div className="relative mb-3">
                  <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="Поиск..."
                    className="pl-8"
                    data-testid="input-user-search"
                  />
                </div>
                <div className="max-h-[480px] overflow-y-auto divide-y border rounded-md">
                  {filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setSelectedUserId(u.id)}
                      className={`w-full text-left p-2 hover:bg-slate-50 ${
                        selectedUserId === u.id ? "bg-slate-100" : ""
                      }`}
                      data-testid={`row-user-${u.id}`}
                    >
                      <div className="text-sm font-medium truncate">{u.name}</div>
                      <div className="text-xs text-slate-500 truncate">
                        {u.username} · {u.role}
                      </div>
                    </button>
                  ))}
                  {filteredUsers.length === 0 && (
                    <div className="p-3 text-sm text-slate-500">Нет совпадений</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>
                  {userPerms
                    ? <>Права: {userPerms.user.name} <span className="text-sm font-normal text-slate-500">({userPerms.user.role})</span></>
                    : "Выберите сотрудника"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedUserId && (
                  <div className="text-sm text-slate-500">
                    Выберите сотрудника слева, чтобы увидеть его права.
                  </div>
                )}
                {selectedUserId && userPermsLoading && (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                )}
                {selectedUserId && userPerms && (
                  <>
                    <div className="space-y-6">
                      {groupedPermissions.map(({ category, perms }) => (
                        <div key={category.key}>
                          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-2">
                            {category.label}
                          </h3>
                          <div className="divide-y border rounded-md">
                            {perms.map((p) => {
                              const item = userPerms.items.find((i) => i.key === p.key);
                              if (!item) return null;
                              const draft = draftUser[p.key] ?? null;
                              const valueStr = draft ?? "inherit";
                              const effective = draft
                                ? (draft === "enabled")
                                : item.roleValue;
                              return (
                                <div key={p.key} className="p-3">
                                  <div className="flex items-start justify-between gap-3 flex-wrap">
                                    <div className="min-w-0 flex-1">
                                      <div className="font-medium text-sm">{p.name}</div>
                                      <div className="text-xs text-slate-500">{p.description}</div>
                                      <div className="text-xs mt-1">
                                        <span className="text-slate-500">Сейчас действует:</span>{" "}
                                        <Badge variant={effective ? "default" : "secondary"}>
                                          {effective ? "Включено" : "Выключено"}
                                        </Badge>{" "}
                                        <span className="text-slate-400">
                                          (наследуется от роли: {item.roleValue ? "включено" : "выключено"})
                                        </span>
                                      </div>
                                    </div>
                                    <Select
                                      value={valueStr}
                                      onValueChange={(v) =>
                                        setDraftUser((s) => ({
                                          ...s,
                                          [p.key]: v === "inherit" ? null : (v as "enabled" | "disabled"),
                                        }))
                                      }
                                    >
                                      <SelectTrigger className="w-[180px]" data-testid={`select-user-perm-${p.key}`}>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="inherit">По умолчанию</SelectItem>
                                        <SelectItem value="enabled">Включено</SelectItem>
                                        <SelectItem value="disabled">Выключено</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
                      <div className="text-sm text-slate-600">
                        {userDirty.length > 0
                          ? <>Несохранённых изменений: <b>{userDirty.length}</b></>
                          : "Изменений нет"}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setConfirmUserResetOpen(true)}
                          disabled={resetUserMut.isPending}
                          data-testid="button-reset-user"
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Сбросить персональные
                        </Button>
                        <Button
                          onClick={() => setConfirmUserSaveOpen(true)}
                          disabled={userDirty.length === 0 || saveUserMut.isPending}
                          data-testid="button-save-user"
                        >
                          <Save className="w-4 h-4 mr-1" />
                          Сохранить
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===================== Журнал ===================== */}
        <TabsContent value="audit">
          <Card>
            <CardHeader><CardTitle>Журнал последних изменений (до 100 записей)</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">Когда</th>
                      <th className="py-2 pr-3">Кто</th>
                      <th className="py-2 pr-3">Где</th>
                      <th className="py-2 pr-3">Право</th>
                      <th className="py-2 pr-3">Было</th>
                      <th className="py-2 pr-3">Стало</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(auditEntries ?? []).map((e) => (
                      <tr key={e.id} className="border-t" data-testid={`row-audit-${e.id}`}>
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {new Date(e.changedAt).toLocaleString("ru-RU")}
                        </td>
                        <td className="py-2 pr-3">{e.actor?.name ?? "—"}</td>
                        <td className="py-2 pr-3">
                          {e.scope === "role" ? "роль" : "сотрудник"}: {e.scopeLabel}
                        </td>
                        <td className="py-2 pr-3">{e.permissionName}</td>
                        <td className="py-2 pr-3">{valueLabel(e.prevValue)}</td>
                        <td className="py-2 pr-3">{valueLabel(e.newValue)}</td>
                      </tr>
                    ))}
                    {(!auditEntries || auditEntries.length === 0) && (
                      <tr><td colSpan={6} className="py-4 text-slate-500 text-center">Журнал пуст</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ===== Подтверждения ===== */}
      <AlertDialog open={confirmRoleSaveOpen} onOpenChange={setConfirmRoleSaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Сохранить изменения?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы изменили {roleDirty.length}{" "}
              {roleDirty.length === 1 ? "право" : roleDirty.length < 5 ? "права" : "прав"}{" "}
              для роли «{registry?.roles.find((r) => r.key === selectedRole)?.label}». Сохранить?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={() => saveRoleMut.mutate()}>Сохранить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmRoleResetOpen} onOpenChange={setConfirmRoleResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Сбросить настройки роли?</AlertDialogTitle>
            <AlertDialogDescription>
              Все права роли «{registry?.roles.find((r) => r.key === selectedRole)?.label}» будут
              возвращены к значениям по умолчанию.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={() => resetRoleMut.mutate()}>Сбросить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmUserSaveOpen} onOpenChange={setConfirmUserSaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Сохранить персональные настройки?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы изменили {userDirty.length}{" "}
              {userDirty.length === 1 ? "право" : userDirty.length < 5 ? "права" : "прав"}{" "}
              для {userPerms?.user.name}. Сохранить?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={() => saveUserMut.mutate()}>Сохранить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmUserResetOpen} onOpenChange={setConfirmUserResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Сбросить персональные настройки?</AlertDialogTitle>
            <AlertDialogDescription>
              Все индивидуальные переопределения для {userPerms?.user.name} будут сняты.
              Сотрудник снова будет работать строго по правам своей роли.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={() => resetUserMut.mutate()}>Сбросить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
