import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Building2, Phone, Mail, MapPin, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientSchema, type Client, type InsertClient, type User } from "@shared/schema";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { CorpHeader, MoneyAED, CorpEmpty } from "@/components/corp-ui";

const SECTION_STYLE: React.CSSProperties = {
  background: 'var(--corp-surface)',
  border: '1px solid var(--corp-line)',
  borderRadius: 'var(--corp-r-lg)',
};

function StatusPill({ active, labelOn = 'Активный', labelOff = 'Неактивный' }: { active: boolean; labelOn?: string; labelOff?: string }) {
  return (
    <span
      className="inline-flex items-center px-2 h-5 text-[10px] font-bold uppercase"
      style={{
        background: active ? 'rgba(22,163,74,0.10)' : 'var(--corp-surface-2)',
        color: active ? 'var(--corp-pos)' : 'var(--corp-ink-3)',
        borderRadius: 'var(--corp-r-sm)',
        letterSpacing: '0.04em',
      }}
    >
      {active ? labelOn : labelOff}
    </span>
  );
}

function DeletedPill() {
  return (
    <span
      className="inline-flex items-center px-2 h-5 text-[10px] font-bold uppercase"
      style={{
        background: 'rgba(220,38,38,0.10)',
        color: 'var(--corp-neg)',
        borderRadius: 'var(--corp-r-sm)',
        letterSpacing: '0.04em',
      }}
    >
      Удален
    </span>
  );
}

function ClientCard({
  client, role, clientUsers, onEdit, onDelete, onRestore, onClick, deleted = false,
}: {
  client: Client;
  role?: string;
  clientUsers: User[];
  onEdit?: (c: Client) => void;
  onDelete?: (c: Client) => void;
  onRestore?: (c: Client) => void;
  onClick: () => void;
  deleted?: boolean;
}) {
  const canManage = role === 'admin' || role === 'director';
  return (
    <div
      onClick={onClick}
      className="p-4 cursor-pointer transition-all hover:shadow-md"
      style={{
        ...SECTION_STYLE,
        opacity: deleted ? 0.7 : 1,
      }}
      data-testid={`card-client-${client.id}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Building2 size={14} style={{ color: 'var(--corp-ink-3)' }} />
            <h3 className="text-[14px] font-semibold truncate" style={{ color: 'var(--corp-ink)' }}>
              {client.name}
            </h3>
          </div>
          {client.company && (
            <p className="text-[11px] truncate" style={{ color: 'var(--corp-muted)' }}>
              {client.company}
            </p>
          )}
        </div>
        {deleted ? <DeletedPill /> : <StatusPill active={!!client.isActive} />}
      </div>

      <div className="space-y-1.5 mt-3">
        {client.contactPerson && (
          <div className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--corp-ink-2)' }}>
            <span style={{ color: 'var(--corp-muted)' }}>Контакт:</span>
            <span>{client.contactPerson}</span>
          </div>
        )}
        {client.phone && (
          <div className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--corp-ink-2)' }}>
            <Phone size={12} style={{ color: 'var(--corp-ink-3)' }} />
            <span style={{ fontFamily: 'var(--corp-mono)' }}>{client.phone}</span>
          </div>
        )}
        {client.email && (
          <div className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--corp-ink-2)' }}>
            <Mail size={12} style={{ color: 'var(--corp-ink-3)' }} />
            <span className="truncate">{client.email}</span>
          </div>
        )}
        {client.address && (
          <div className="flex items-start gap-1.5 text-[12px]" style={{ color: 'var(--corp-ink-2)' }}>
            <MapPin size={12} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--corp-ink-3)' }} />
            <span>{client.address}</span>
          </div>
        )}
        {client.userId && (
          <div className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--corp-ink-2)' }}>
            <span style={{ color: 'var(--corp-muted)' }}>Пользователь:</span>
            <span>{clientUsers.find(u => u.id === client.userId)?.name || 'Не найден'}</span>
          </div>
        )}
      </div>

      {(canManage && !deleted && onEdit && onDelete) && (
        <div className="flex justify-end gap-2 pt-3 mt-3" style={{ borderTop: '1px solid var(--corp-line)' }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(client); }}
            className="inline-flex items-center gap-1 h-8 px-3 text-[12px] font-semibold transition-colors"
            style={{
              background: 'var(--corp-surface-2)',
              color: 'var(--corp-ink-2)',
              borderRadius: 'var(--corp-r)',
            }}
            data-testid={`button-edit-${client.id}`}
          >
            <Edit2 size={12} /> Изменить
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(client); }}
            className="inline-flex items-center gap-1 h-8 px-3 text-[12px] font-semibold transition-colors"
            style={{
              background: 'rgba(220,38,38,0.10)',
              color: 'var(--corp-neg)',
              borderRadius: 'var(--corp-r)',
            }}
            data-testid={`button-delete-${client.id}`}
          >
            <Trash2 size={12} /> Удалить
          </button>
        </div>
      )}

      {(deleted && onRestore) && (
        <div className="flex justify-end gap-2 pt-3 mt-3" style={{ borderTop: '1px solid var(--corp-line)' }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRestore(client); }}
            className="inline-flex items-center gap-1 h-8 px-3 text-[12px] font-semibold transition-colors"
            style={{
              background: 'rgba(22,163,74,0.10)',
              color: 'var(--corp-pos)',
              borderRadius: 'var(--corp-r)',
            }}
            data-testid={`button-restore-${client.id}`}
          >
            <RotateCcw size={12} /> Восстановить
          </button>
        </div>
      )}
    </div>
  );
}

export default function ClientsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState("active");

  const goBack = () => setLocation('/director');

  const isClientUser = user?.role === 'client';

  const { data: clientProjects, isLoading: isLoadingProjects, error: projectsError } = useQuery({
    queryKey: ["/api/my-client-projects"],
    enabled: isClientUser,
  });

  const { data: clients, isLoading } = useQuery({
    queryKey: ["/api/clients"],
    enabled: !isClientUser,
  });

  const { data: deletedClients } = useQuery({
    queryKey: ["/api/clients/deleted"],
    enabled: !isClientUser && activeTab === "deleted",
  });

  const { data: clientUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users", "client"],
    queryFn: async () => {
      const response = await apiRequest("/api/users?role=client", { method: "GET" });
      return response.json();
    },
    enabled: !isClientUser,
  });

  const form = useForm<InsertClient>({
    resolver: zodResolver(insertClientSchema),
    defaultValues: {
      name: "",
      company: "",
      phone: "",
      email: "",
      address: "",
      contactPerson: "",
      userId: undefined,
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertClient) => {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create client");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Заказчик создан успешно" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось создать заказчика", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertClient> }) => {
      const response = await fetch(`/api/clients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update client");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setIsDialogOpen(false);
      setEditingClient(null);
      form.reset();
      toast({ title: "Заказчик обновлен успешно" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось обновить заказчика", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/clients/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete client");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients/deleted"] });
      toast({ title: "Заказчик перемещен в удаленные" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось удалить заказчика", variant: "destructive" });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/clients/${id}/restore`, { method: "POST" });
      if (!response.ok) throw new Error("Failed to restore client");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients/deleted"] });
      toast({ title: "Заказчик восстановлен успешно" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось восстановить заказчика", variant: "destructive" });
    },
  });

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    form.reset({
      name: client.name,
      company: client.company || "",
      phone: client.phone || "",
      email: client.email || "",
      address: client.address || "",
      contactPerson: client.contactPerson || "",
      userId: client.userId || undefined,
      isActive: client.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (client: Client) => {
    if (window.confirm(`Вы уверены, что хотите удалить заказчика "${client.name}"?`)) {
      deleteMutation.mutate(client.id);
    }
  };

  const handleRestore = (client: Client) => {
    if (window.confirm(`Вы уверены, что хотите восстановить заказчика "${client.name}"?`)) {
      restoreMutation.mutate(client.id);
    }
  };

  const onSubmit = (data: InsertClient) => {
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingClient(null);
    form.reset();
  };

  // ============= CLIENT USER VIEW =============
  if (isClientUser) {
    if (isLoadingProjects) {
      return (
        <div className="min-h-screen" style={{ background: 'var(--corp-bg)' }}>
          <CorpHeader title="Мои проекты" onBack={() => {}} />
        </div>
      );
    }

    if (projectsError) {
      return (
        <div className="min-h-screen" style={{ background: 'var(--corp-bg)' }}>
          <div className="p-4">
            <CorpEmpty
              icon={<Building2 size={28} />}
              title="Ошибка загрузки"
              description="Не удалось загрузить проекты"
            />
          </div>
        </div>
      );
    }

    const projectsArr = Array.isArray(clientProjects) ? clientProjects : [];

    return (
      <div className="min-h-screen pb-24" style={{ background: 'var(--corp-bg)' }}>
        <header
          className="sticky top-0 z-40"
          style={{ background: 'var(--corp-surface)', borderBottom: '1px solid var(--corp-line)' }}
        >
          <div className="px-3 sm:px-4 h-14 flex items-center justify-between">
            <h1 className="text-[15px] font-bold" style={{ color: 'var(--corp-ink)' }}>
              Мои проекты
            </h1>
            <button
              type="button"
              onClick={async () => {
                await apiRequest('/api/auth/logout', { method: 'POST' });
                setLocation('/login');
              }}
              className="h-8 px-3 text-[12px] font-semibold transition-colors"
              style={{
                background: 'var(--corp-surface-2)',
                color: 'var(--corp-ink-2)',
                borderRadius: 'var(--corp-r)',
              }}
              data-testid="button-logout"
            >
              Выйти
            </button>
          </div>
        </header>

        <div className="p-4 space-y-3">
          {projectsArr.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {projectsArr.map((project: any) => (
                <div
                  key={project.id}
                  onClick={() => setLocation(`/projects/${project.projectId}`)}
                  className="p-4 cursor-pointer transition-all hover:shadow-md"
                  style={SECTION_STYLE}
                  data-testid={`card-project-${project.id}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Building2 size={14} style={{ color: 'var(--corp-ink-3)' }} />
                        <h3 className="text-[14px] font-semibold truncate" style={{ color: 'var(--corp-ink)' }}>
                          {project.projectName}
                        </h3>
                      </div>
                      {project.location && (
                        <p className="text-[11px] truncate" style={{ color: 'var(--corp-muted)' }}>
                          {project.location}
                        </p>
                      )}
                    </div>
                    <StatusPill active={project.status === 'active'} labelOn="Активный" labelOff="Завершен" />
                  </div>

                  <div className="space-y-1.5 mt-3">
                    <div className="flex items-center justify-between text-[12px]">
                      <span style={{ color: 'var(--corp-muted)' }}>Стоимость</span>
                      <MoneyAED amount={Number(project.totalCost) || 0} size={13} weight={600} tone="ink" />
                    </div>
                    <div className="flex items-center justify-between text-[12px]">
                      <span style={{ color: 'var(--corp-muted)' }}>Оплачено</span>
                      <MoneyAED amount={Number(project.totalPaid) || 0} size={13} weight={600} tone="pos" />
                    </div>
                    {project.contractNumber && (
                      <div className="flex items-center justify-between text-[12px]">
                        <span style={{ color: 'var(--corp-muted)' }}>Договор</span>
                        <span style={{ color: 'var(--corp-ink)', fontFamily: 'var(--corp-mono)' }}>{project.contractNumber}</span>
                      </div>
                    )}
                    {project.description && (
                      <p className="text-[11px] pt-1.5" style={{ color: 'var(--corp-ink-3)' }}>
                        {project.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <CorpEmpty
              icon={<Building2 size={28} />}
              title="Проектов не найдено"
              description="На вас еще не назначен ни один проект"
            />
          )}
        </div>
      </div>
    );
  }

  // ============= ADMIN/DIRECTOR VIEW =============
  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--corp-bg)' }}>
        <CorpHeader title="Заказчики" onBack={goBack} />
      </div>
    );
  }

  const clientsArr = (clients as Client[]) || [];
  const deletedArr = (deletedClients as Client[]) || [];
  const canManage = user?.role === 'admin' || user?.role === 'director';

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--corp-bg)' }}>
      <CorpHeader
        title="Заказчики"
        onBack={goBack}
        action={
          canManage ? (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="inline-flex items-center gap-1 h-9 px-3 text-[12px] font-semibold transition-colors"
                  style={{ background: 'var(--corp-accent)', color: '#fff', borderRadius: 'var(--corp-r)' }}
                  data-testid="button-add-client"
                >
                  <Plus size={14} /> Добавить
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingClient ? "Редактировать заказчика" : "Добавить заказчика"}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Название *</FormLabel>
                            <FormControl>
                              <Input placeholder="Название заказчика" {...field} data-testid="input-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="company"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Компания</FormLabel>
                            <FormControl>
                              <Input placeholder="Название компании" {...field} value={field.value || ""} data-testid="input-company" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Телефон</FormLabel>
                            <FormControl>
                              <Input placeholder="+971 XX XXX XXXX" {...field} value={field.value || ""} data-testid="input-phone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="email@example.com" {...field} value={field.value || ""} data-testid="input-email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Адрес</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Адрес заказчика" {...field} value={field.value || ""} data-testid="input-address" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contactPerson"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Контактное лицо</FormLabel>
                          <FormControl>
                            <Input placeholder="Имя контактного лица" {...field} value={field.value || ""} data-testid="input-contact" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="userId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Связанный пользователь</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}
                            value={field.value || "none"}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-user">
                                <SelectValue placeholder="Выберите пользователя с правами заказчика" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Не назначен</SelectItem>
                              {clientUsers.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.name} ({u.username})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem
                          className="flex flex-row items-center justify-between p-4"
                          style={{ border: '1px solid var(--corp-line)', borderRadius: 'var(--corp-r)' }}
                        >
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Активный</FormLabel>
                            <div className="text-sm" style={{ color: 'var(--corp-muted)' }}>
                              Заказчик активен и может быть назначен на проекты
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value || false}
                              onCheckedChange={field.onChange}
                              data-testid="switch-active"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleDialogClose}
                        className="h-10 px-4 text-[13px] font-semibold transition-colors"
                        style={{
                          background: 'var(--corp-surface-2)',
                          color: 'var(--corp-ink-2)',
                          borderRadius: 'var(--corp-r)',
                        }}
                        data-testid="button-cancel"
                      >
                        Отмена
                      </button>
                      <button
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending}
                        className="h-10 px-4 text-[13px] font-semibold transition-colors disabled:opacity-50"
                        style={{
                          background: 'var(--corp-accent)',
                          color: '#fff',
                          borderRadius: 'var(--corp-r)',
                        }}
                        data-testid="button-save"
                      >
                        {editingClient ? "Обновить" : "Создать"}
                      </button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          ) : undefined
        }
      />

      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="active" data-testid="tab-active">Активные</TabsTrigger>
            <TabsTrigger value="deleted" data-testid="tab-deleted">Удаленные</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-3">
            {clientsArr.length === 0 ? (
              <CorpEmpty
                icon={<Building2 size={28} />}
                title="Заказчики не найдены"
                description="Добавьте первого заказчика для начала работы"
                actionLabel={canManage ? "Добавить заказчика" : undefined}
                onAction={canManage ? () => setIsDialogOpen(true) : undefined}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {clientsArr.map((client: Client) => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    role={user?.role}
                    clientUsers={clientUsers}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onClick={() => setLocation(`/clients/${client.id}`)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="deleted" className="space-y-3">
            {deletedArr.length === 0 ? (
              <CorpEmpty
                icon={<Building2 size={28} />}
                title="Удаленных заказчиков нет"
                description="Все удаленные заказчики будут отображаться здесь"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {deletedArr.map((client: Client) => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    role={user?.role}
                    clientUsers={clientUsers}
                    onRestore={handleRestore}
                    onClick={() => setLocation(`/clients/${client.id}`)}
                    deleted
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
