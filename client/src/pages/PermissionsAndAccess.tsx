import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShieldCheck, RotateCcw, Save, Search, History as HistoryIcon, ArrowLeft, Users as UsersIcon, UserCog } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { fmtDateTime } from "@/lib/locale";

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

export default function PermissionsAndAccess() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const valueLabel = (v: string | null): string => {
    switch (v) {
      case "enabled": return t('perm_enabled');
      case "disabled": return t('perm_disabled');
      case "inherit": return t('perm_inherit');
      default: return t('perm_dash');
    }
  };

  const rightWord = (count: number): string => {
    if (count === 1) return t('perm_rightOne');
    if (count < 5) return t('perm_rightFew');
    return t('perm_rightMany');
  };

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
      toast({ title: t('perm_savedToast'), description: t('perm_changesCountLabel').replace('{count}', String(roleDirty.length)) });
      qc.invalidateQueries({ queryKey: ["/api/permissions/role", selectedRole] });
      qc.invalidateQueries({ queryKey: ["/api/permissions/audit"] });
      qc.invalidateQueries({ queryKey: ["/api/permissions/me"] });
    },
    onError: (e: any) => toast({ title: t('error'), description: String(e?.message ?? e), variant: "destructive" }),
  });

  const resetRoleMut = useMutation({
    mutationFn: async () => apiRequest(`/api/permissions/role/${selectedRole}/reset`, { method: "POST" }),
    onSuccess: () => {
      toast({ title: t('perm_resetToDefaultsToast') });
      qc.invalidateQueries({ queryKey: ["/api/permissions/role", selectedRole] });
      qc.invalidateQueries({ queryKey: ["/api/permissions/audit"] });
      qc.invalidateQueries({ queryKey: ["/api/permissions/me"] });
    },
    onError: (e: any) => toast({ title: t('error'), description: String(e?.message ?? e), variant: "destructive" }),
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
      toast({ title: t('perm_savedToast'), description: t('perm_changesCountLabel').replace('{count}', String(userDirty.length)) });
      qc.invalidateQueries({ queryKey: ["/api/permissions/user", selectedUserId] });
      qc.invalidateQueries({ queryKey: ["/api/permissions/audit"] });
      qc.invalidateQueries({ queryKey: ["/api/permissions/me"] });
    },
    onError: (e: any) => toast({ title: t('error'), description: String(e?.message ?? e), variant: "destructive" }),
  });

  const resetUserMut = useMutation({
    mutationFn: async () => apiRequest(`/api/permissions/user/${selectedUserId}/reset`, { method: "POST" }),
    onSuccess: () => {
      toast({ title: t('perm_personalSettingsReset') });
      qc.invalidateQueries({ queryKey: ["/api/permissions/user", selectedUserId] });
      qc.invalidateQueries({ queryKey: ["/api/permissions/audit"] });
      qc.invalidateQueries({ queryKey: ["/api/permissions/me"] });
    },
    onError: (e: any) => toast({ title: t('error'), description: String(e?.message ?? e), variant: "destructive" }),
  });

  // ===== Tab "По персоналу" =====
  // Все карточки персонала (HR-записи). Те, у кого userId === null, не имеют логина —
  // их нельзя выбрать для настройки прав, но они показываются в списке с подсказкой
  // «создать учётку прямо в карточке персонала».
  interface PersonnelLite {
    id: string;
    firstName: string;
    lastName: string;
    middleName?: string | null;
    specialization?: string | null;
    status?: string | null;
    userId?: string | null;
  }
  const { data: allPersonnel } = useQuery<PersonnelLite[]>({
    queryKey: ["/api/personnel"],
    enabled: user?.role === "admin",
  });

  const [personnelQuery, setPersonnelQuery] = useState("");
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string | null>(null);

  const filteredPersonnel = useMemo(() => {
    const list = allPersonnel ?? [];
    const q = personnelQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => {
      const fullName = `${p.lastName} ${p.firstName} ${p.middleName ?? ""}`.toLowerCase();
      const spec = (p.specialization ?? "").toLowerCase();
      return fullName.includes(q) || spec.includes(q);
    });
  }, [allPersonnel, personnelQuery]);

  const selectedPersonnel = useMemo(
    () => (allPersonnel ?? []).find((p) => p.id === selectedPersonnelId) ?? null,
    [allPersonnel, selectedPersonnelId],
  );

  // Когда выбран персонал с привязанным userId — переиспользуем тот же endpoint,
  // что и для вкладки «По сотрудникам» (общий стейт `draftUser` и мутации не пересекаются —
  // selectedUserId один на всю страницу).
  const personnelLinkedUserId = selectedPersonnel?.userId ?? null;

  const { data: personnelUserPerms, isLoading: personnelUserPermsLoading } = useQuery<UserPermResponse>({
    queryKey: ["/api/permissions/user", personnelLinkedUserId],
    enabled: user?.role === "admin" && !!personnelLinkedUserId,
  });

  const [draftPersonnelUser, setDraftPersonnelUser] = useState<Record<string, "enabled" | "disabled" | null>>({});
  useEffect(() => {
    if (personnelUserPerms) {
      const m: Record<string, "enabled" | "disabled" | null> = {};
      for (const it of personnelUserPerms.items) m[it.key] = it.override;
      setDraftPersonnelUser(m);
    } else {
      setDraftPersonnelUser({});
    }
  }, [personnelUserPerms]);

  const personnelUserDirty = useMemo(() => {
    if (!personnelUserPerms) return [] as Array<[string, "enabled" | "disabled" | null]>;
    const orig = new Map(personnelUserPerms.items.map((it) => [it.key, it.override]));
    return Object.entries(draftPersonnelUser).filter(([k, v]) => orig.get(k) !== v) as Array<[string, "enabled" | "disabled" | null]>;
  }, [draftPersonnelUser, personnelUserPerms]);

  const [confirmPersonnelSaveOpen, setConfirmPersonnelSaveOpen] = useState(false);
  const [confirmPersonnelResetOpen, setConfirmPersonnelResetOpen] = useState(false);

  const savePersonnelUserMut = useMutation({
    mutationFn: async () => {
      const updates = personnelUserDirty.map(([key, state]) => ({ key, state }));
      return apiRequest(`/api/permissions/user/${personnelLinkedUserId}`, {
        method: "PUT",
        body: JSON.stringify({ updates }),
      });
    },
    onSuccess: () => {
      toast({ title: t('perm_savedToast'), description: t('perm_changesCountLabel').replace('{count}', String(personnelUserDirty.length)) });
      qc.invalidateQueries({ queryKey: ["/api/permissions/user", personnelLinkedUserId] });
      qc.invalidateQueries({ queryKey: ["/api/permissions/audit"] });
      qc.invalidateQueries({ queryKey: ["/api/permissions/me"] });
    },
    onError: (e: any) => toast({ title: t('error'), description: String(e?.message ?? e), variant: "destructive" }),
  });

  const resetPersonnelUserMut = useMutation({
    mutationFn: async () => apiRequest(`/api/permissions/user/${personnelLinkedUserId}/reset`, { method: "POST" }),
    onSuccess: () => {
      toast({ title: t('perm_personalSettingsReset') });
      qc.invalidateQueries({ queryKey: ["/api/permissions/user", personnelLinkedUserId] });
      qc.invalidateQueries({ queryKey: ["/api/permissions/audit"] });
      qc.invalidateQueries({ queryKey: ["/api/permissions/me"] });
    },
    onError: (e: any) => toast({ title: t('error'), description: String(e?.message ?? e), variant: "destructive" }),
  });

  // ===== Tab "Журнал" =====
  const { data: auditEntries } = useQuery<AuditEntry[]>({
    queryKey: ["/api/permissions/audit"],
    enabled: user?.role === "admin",
  });

  if (user?.role !== "admin") {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold mb-2">{t('accessDenied')}</h1>
        <p className="text-slate-600">{t('perm_adminOnlySection')}</p>
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
          {t('perm_backToAdmin')}
        </Button>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-slate-600" />
          <h1 className="text-xl sm:text-2xl font-semibold">{t('permissions')}</h1>
        </div>
      </div>

      <p className="text-sm text-slate-600 mb-4">
        {t('perm_pageDescription')}
      </p>

      <Tabs defaultValue="by-role" className="w-full">
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="by-role" data-testid="tab-by-role">{t('perm_tabByRole')}</TabsTrigger>
          <TabsTrigger value="by-user" data-testid="tab-by-user">
            <UsersIcon className="w-4 h-4 mr-1" />
            {t('perm_tabByUser')}
          </TabsTrigger>
          <TabsTrigger value="by-personnel" data-testid="tab-by-personnel">
            <UserCog className="w-4 h-4 mr-1" />
            {t('perm_tabByPersonnel')}
          </TabsTrigger>
          <TabsTrigger value="audit" data-testid="tab-audit">
            <HistoryIcon className="w-4 h-4 mr-1" />
            {t('perm_tabAudit')}
          </TabsTrigger>
        </TabsList>

        {/* ===================== По ролям ===================== */}
        <TabsContent value="by-role">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3 flex-wrap">
                <span>{t('perm_roleSettings')}</span>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-[180px]" data-testid="select-role">
                    <SelectValue placeholder={t('selectRole')} />
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
                              {t('perm_enableAll')}
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
                              {t('perm_disableAll')}
                            </Button>
                          </div>
                        </div>
                        <div className="divide-y border rounded-md">
                          {perms.map((p) => {
                            const v = draftRole[p.key] ?? false;
                            return (
                              <div key={p.key} className="flex items-start gap-3 p-3">
                                <Checkbox
                                  checked={v}
                                  onCheckedChange={(checked) =>
                                    setDraftRole((s) => ({ ...s, [p.key]: !!checked }))
                                  }
                                  className="mt-1"
                                  data-testid={`checkbox-role-${p.key}`}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-sm">{p.name}</div>
                                  <div className="text-xs text-slate-500">{p.description}</div>
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
                      {roleDirty.length > 0
                        ? t('perm_unsavedChangesLabel').replace('{count}', String(roleDirty.length))
                        : t('perm_noChanges')}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setConfirmRoleResetOpen(true)}
                        disabled={resetRoleMut.isPending}
                        data-testid="button-reset-role"
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        {t('perm_resetToDefault')}
                      </Button>
                      <Button
                        onClick={() => setConfirmRoleSaveOpen(true)}
                        disabled={roleDirty.length === 0 || saveRoleMut.isPending}
                        data-testid="button-save-role"
                      >
                        <Save className="w-4 h-4 mr-1" />
                        {t('save')}
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
              <CardHeader><CardTitle>{t('employees')}</CardTitle></CardHeader>
              <CardContent>
                <div className="relative mb-3">
                  <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder={t('perm_searchPlaceholderShort')}
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
                    <div className="p-3 text-sm text-slate-500">{t('perm_noMatches')}</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>
                  {userPerms
                    ? <>{t('perm_permissionsLabel')}: {userPerms.user.name} <span className="text-sm font-normal text-slate-500">({userPerms.user.role})</span></>
                    : t('perm_selectEmployee')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedUserId && (
                  <div className="text-sm text-slate-500">
                    {t('perm_selectUserHint')}
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
                                        <span className="text-slate-500">{t('perm_currentlyActive')}</span>{" "}
                                        <Badge variant={effective ? "default" : "secondary"}>
                                          {effective ? t('perm_enabled') : t('perm_disabled')}
                                        </Badge>{" "}
                                        <span className="text-slate-400">
                                          {t('perm_inheritedFromRole').replace('{value}', item.roleValue ? t('perm_enabledShort') : t('perm_disabledShort'))}
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
                                        <SelectItem value="inherit">{t('perm_inherit')}</SelectItem>
                                        <SelectItem value="enabled">{t('perm_enabled')}</SelectItem>
                                        <SelectItem value="disabled">{t('perm_disabled')}</SelectItem>
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
                          ? t('perm_unsavedChangesLabel').replace('{count}', String(userDirty.length))
                          : t('perm_noChanges')}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setConfirmUserResetOpen(true)}
                          disabled={resetUserMut.isPending}
                          data-testid="button-reset-user"
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          {t('perm_resetPersonal')}
                        </Button>
                        <Button
                          onClick={() => setConfirmUserSaveOpen(true)}
                          disabled={userDirty.length === 0 || saveUserMut.isPending}
                          data-testid="button-save-user"
                        >
                          <Save className="w-4 h-4 mr-1" />
                          {t('save')}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===================== По персоналу ===================== */}
        <TabsContent value="by-personnel">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>{t('personnel')}</CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                  {t('perm_personnelHint')}
                </p>
              </CardHeader>
              <CardContent>
                <div className="relative mb-3">
                  <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={personnelQuery}
                    onChange={(e) => setPersonnelQuery(e.target.value)}
                    placeholder={t('perm_searchPersonnelPlaceholder')}
                    className="pl-8"
                    data-testid="input-personnel-search"
                  />
                </div>
                <div className="max-h-[480px] overflow-y-auto divide-y border rounded-md">
                  {filteredPersonnel.map((p) => {
                    const linked = !!p.userId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPersonnelId(p.id)}
                        className={`w-full text-left p-2 hover:bg-slate-50 ${
                          selectedPersonnelId === p.id ? "bg-slate-100" : ""
                        }`}
                        data-testid={`row-personnel-${p.id}`}
                      >
                        <div className="text-sm font-medium truncate">
                          {p.lastName} {p.firstName}{p.middleName ? ` ${p.middleName}` : ""}
                        </div>
                        <div className="text-xs text-slate-500 truncate flex items-center gap-2">
                          <span>{p.specialization || "—"}</span>
                          {linked ? (
                            <Badge variant="default" className="text-[10px] py-0 h-4">{t('perm_hasAccount')}</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] py-0 h-4">{t('perm_noAccount')}</Badge>
                          )}
                        </div>
                      </button>
                    );
                  })}
                  {filteredPersonnel.length === 0 && (
                    <div className="p-3 text-sm text-slate-500">{t('perm_noMatches')}</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>
                  {selectedPersonnel ? (
                    <>
                      {t('perm_permissionsLabel')}: {selectedPersonnel.lastName} {selectedPersonnel.firstName}
                      {personnelUserPerms && (
                        <span className="text-sm font-normal text-slate-500"> ({personnelUserPerms.user.role})</span>
                      )}
                    </>
                  ) : (
                    t('perm_selectEmployee')
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedPersonnel && (
                  <div className="text-sm text-slate-500">
                    {t('perm_selectPersonnelHint')}
                  </div>
                )}
                {selectedPersonnel && !personnelLinkedUserId && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm">
                    <div className="font-medium text-amber-900 mb-1">{t('perm_noAccountTitle')}</div>
                    <p className="text-amber-800 mb-3">
                      {t('perm_noAccountDesc').replace('{name}', `${selectedPersonnel.lastName} ${selectedPersonnel.firstName}`)}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setLocation(`/personnel/${selectedPersonnel.id}`)}
                      data-testid="button-open-personnel-card"
                    >
                      {t('perm_openPersonnelCard')}
                    </Button>
                  </div>
                )}
                {selectedPersonnel && personnelLinkedUserId && personnelUserPermsLoading && (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                )}
                {selectedPersonnel && personnelLinkedUserId && personnelUserPerms && (
                  <>
                    <div className="space-y-6">
                      {groupedPermissions.map(({ category, perms }) => (
                        <div key={category.key}>
                          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-2">
                            {category.label}
                          </h3>
                          <div className="divide-y border rounded-md">
                            {perms.map((p) => {
                              const item = personnelUserPerms.items.find((i) => i.key === p.key);
                              if (!item) return null;
                              const draft = draftPersonnelUser[p.key] ?? null;
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
                                        <span className="text-slate-500">{t('perm_currentlyActive')}</span>{" "}
                                        <Badge variant={effective ? "default" : "secondary"}>
                                          {effective ? t('perm_enabled') : t('perm_disabled')}
                                        </Badge>{" "}
                                        <span className="text-slate-400">
                                          {t('perm_inheritedFromRole').replace('{value}', item.roleValue ? t('perm_enabledShort') : t('perm_disabledShort'))}
                                        </span>
                                      </div>
                                    </div>
                                    <Select
                                      value={valueStr}
                                      onValueChange={(v) =>
                                        setDraftPersonnelUser((s) => ({
                                          ...s,
                                          [p.key]: v === "inherit" ? null : (v as "enabled" | "disabled"),
                                        }))
                                      }
                                    >
                                      <SelectTrigger className="w-[180px]" data-testid={`select-personnel-perm-${p.key}`}>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="inherit">{t('perm_inherit')}</SelectItem>
                                        <SelectItem value="enabled">{t('perm_enabled')}</SelectItem>
                                        <SelectItem value="disabled">{t('perm_disabled')}</SelectItem>
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
                        {personnelUserDirty.length > 0
                          ? t('perm_unsavedChangesLabel').replace('{count}', String(personnelUserDirty.length))
                          : t('perm_noChanges')}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setConfirmPersonnelResetOpen(true)}
                          disabled={resetPersonnelUserMut.isPending}
                          data-testid="button-reset-personnel"
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          {t('perm_resetPersonal')}
                        </Button>
                        <Button
                          onClick={() => setConfirmPersonnelSaveOpen(true)}
                          disabled={personnelUserDirty.length === 0 || savePersonnelUserMut.isPending}
                          data-testid="button-save-personnel"
                        >
                          <Save className="w-4 h-4 mr-1" />
                          {t('save')}
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
            <CardHeader><CardTitle>{t('perm_auditLogTitle')}</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">{t('perm_colWhen')}</th>
                      <th className="py-2 pr-3">{t('perm_colWho')}</th>
                      <th className="py-2 pr-3">{t('perm_colWhere')}</th>
                      <th className="py-2 pr-3">{t('perm_colPermission')}</th>
                      <th className="py-2 pr-3">{t('perm_colBefore')}</th>
                      <th className="py-2 pr-3">{t('perm_colAfter')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(auditEntries ?? []).map((e) => (
                      <tr key={e.id} className="border-t" data-testid={`row-audit-${e.id}`}>
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {fmtDateTime(e.changedAt, language)}
                        </td>
                        <td className="py-2 pr-3">{e.actor?.name ?? "—"}</td>
                        <td className="py-2 pr-3">
                          {t('perm_scopeFormat')
                            .replace('{scope}', e.scope === "role" ? t('perm_scopeRole') : t('perm_scopeUser'))
                            .replace('{label}', e.scopeLabel)}
                        </td>
                        <td className="py-2 pr-3">{e.permissionName}</td>
                        <td className="py-2 pr-3">{valueLabel(e.prevValue)}</td>
                        <td className="py-2 pr-3">{valueLabel(e.newValue)}</td>
                      </tr>
                    ))}
                    {(!auditEntries || auditEntries.length === 0) && (
                      <tr><td colSpan={6} className="py-4 text-slate-500 text-center">{t('perm_auditEmpty')}</td></tr>
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
            <AlertDialogTitle>{t('perm_saveChangesTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('perm_saveRoleConfirm')
                .replace('{count}', String(roleDirty.length))
                .replace('{word}', rightWord(roleDirty.length))
                .replace('{role}', registry?.roles.find((r) => r.key === selectedRole)?.label ?? '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => saveRoleMut.mutate()}>{t('save')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmRoleResetOpen} onOpenChange={setConfirmRoleResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('perm_resetRoleTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('perm_resetRoleDesc').replace('{role}', registry?.roles.find((r) => r.key === selectedRole)?.label ?? '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => resetRoleMut.mutate()}>{t('perm_resetButton')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmUserSaveOpen} onOpenChange={setConfirmUserSaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('perm_savePersonalTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('perm_saveUserConfirm')
                .replace('{count}', String(userDirty.length))
                .replace('{word}', rightWord(userDirty.length))
                .replace('{name}', userPerms?.user.name ?? '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => saveUserMut.mutate()}>{t('save')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmUserResetOpen} onOpenChange={setConfirmUserResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('perm_resetPersonalTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('perm_resetPersonalDesc').replace('{name}', userPerms?.user.name ?? '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => resetUserMut.mutate()}>{t('perm_resetButton')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmPersonnelSaveOpen} onOpenChange={setConfirmPersonnelSaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('perm_savePersonalTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('perm_saveUserConfirm')
                .replace('{count}', String(personnelUserDirty.length))
                .replace('{word}', rightWord(personnelUserDirty.length))
                .replace('{name}', selectedPersonnel ? `${selectedPersonnel.lastName} ${selectedPersonnel.firstName}` : '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => savePersonnelUserMut.mutate()}>{t('save')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmPersonnelResetOpen} onOpenChange={setConfirmPersonnelResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('perm_resetPersonalTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('perm_resetPersonalDesc').replace('{name}', selectedPersonnel ? `${selectedPersonnel.lastName} ${selectedPersonnel.firstName}` : '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => resetPersonnelUserMut.mutate()}>{t('perm_resetButton')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
