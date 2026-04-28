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
import { useLanguage } from "@/components/LanguageProvider";
import { CorpHeader, MoneyAED, CorpEmpty } from "@/components/corp-ui";

const SECTION_STYLE: React.CSSProperties = {
  background: 'var(--corp-surface)',
  border: '1px solid var(--corp-line)',
  borderRadius: 'var(--corp-r-lg)',
};

function StatusPill({ active, labelOn, labelOff }: { active: boolean; labelOn: string; labelOff: string }) {
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

function DeletedPill({ label }: { label: string }) {
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
      {label}
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
  const { t } = useLanguage();
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
        {deleted
          ? <DeletedPill label={t('deletedPill')} />
          : <StatusPill active={!!client.isActive} labelOn={t('activeStatusPill')} labelOff={t('inactiveStatusPill')} />}
      </div>

      <div className="space-y-1.5 mt-3">
        {client.contactPerson && (
          <div className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--corp-ink-2)' }}>
            <span style={{ color: 'var(--corp-muted)' }}>{t('contactColon')}</span>
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
            <span style={{ color: 'var(--corp-muted)' }}>{t('userColon')}</span>
            <span>{clientUsers.find(u => u.id === client.userId)?.name || t('notFoundShort')}</span>
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
            <Edit2 size={12} /> {t('changeLabel')}
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
            <Trash2 size={12} /> {t('deleteShort')}
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
            <RotateCcw size={12} /> {t('restoreLabel')}
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
  const { t } = useLanguage();
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
      toast({ title: t('clientCreatedToast') });
    },
    onError: () => {
      toast({ title: t('errorToastTitle'), description: t('clientCreateFailedToast'), variant: "destructive" });
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
      toast({ title: t('clientUpdatedToast') });
    },
    onError: () => {
      toast({ title: t('errorToastTitle'), description: t('clientUpdateFailedToast'), variant: "destructive" });
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
      toast({ title: t('clientMovedToDeletedToast') });
    },
    onError: () => {
      toast({ title: t('errorToastTitle'), description: t('clientDeleteFailedToast'), variant: "destructive" });
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
      toast({ title: t('clientRestoredToast') });
    },
    onError: () => {
      toast({ title: t('errorToastTitle'), description: t('clientRestoreFailedToast'), variant: "destructive" });
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
    if (window.confirm(t('confirmDeleteClient').replace('{name}', client.name))) {
      deleteMutation.mutate(client.id);
    }
  };

  const handleRestore = (client: Client) => {
    if (window.confirm(t('confirmRestoreClient').replace('{name}', client.name))) {
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
          <CorpHeader title={t('myProjectsTitle')} onBack={() => {}} />
        </div>
      );
    }

    if (projectsError) {
      return (
        <div className="min-h-screen" style={{ background: 'var(--corp-bg)' }}>
          <div className="p-4">
            <CorpEmpty
              icon={<Building2 size={28} />}
              title={t('loadErrorTitle')}
              description={t('loadProjectsFailed')}
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
              {t('myProjectsTitle')}
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
              {t('logoutLabel')}
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
                    <StatusPill active={project.status === 'active'} labelOn={t('activeStatusPill')} labelOff={t('completedStatusPill')} />
                  </div>

                  <div className="space-y-1.5 mt-3">
                    <div className="flex items-center justify-between text-[12px]">
                      <span style={{ color: 'var(--corp-muted)' }}>{t('costLabel')}</span>
                      <MoneyAED amount={Number(project.totalCost) || 0} size={13} weight={600} tone="ink" />
                    </div>
                    <div className="flex items-center justify-between text-[12px]">
                      <span style={{ color: 'var(--corp-muted)' }}>{t('paidLabel')}</span>
                      <MoneyAED amount={Number(project.totalPaid) || 0} size={13} weight={600} tone="pos" />
                    </div>
                    {project.contractNumber && (
                      <div className="flex items-center justify-between text-[12px]">
                        <span style={{ color: 'var(--corp-muted)' }}>{t('contractLabel')}</span>
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
              title={t('noProjectsFound')}
              description={t('noProjectsAssignedYet')}
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
        <CorpHeader title={t('clientsTitle')} onBack={goBack} />
      </div>
    );
  }

  const clientsArr = (clients as Client[]) || [];
  const deletedArr = (deletedClients as Client[]) || [];
  const canManage = user?.role === 'admin' || user?.role === 'director';

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--corp-bg)' }}>
      <CorpHeader
        title={t('clientsTitle')}
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
                  <Plus size={14} /> {t('addLabelShort')}
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingClient ? t('editClientTitle') : t('addClientTitle')}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('nameRequiredStar')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('clientNamePlaceholder')} {...field} data-testid="input-name" />
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
                            <FormLabel>{t('companyLabel')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('companyNamePlaceholder')} {...field} value={field.value || ""} data-testid="input-company" />
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
                            <FormLabel>{t('phoneLabel')}</FormLabel>
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
                          <FormLabel>{t('addressLabel')}</FormLabel>
                          <FormControl>
                            <Textarea placeholder={t('clientAddressPlaceholder')} {...field} value={field.value || ""} data-testid="input-address" />
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
                          <FormLabel>{t('contactPersonLabel')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('contactPersonPlaceholder')} {...field} value={field.value || ""} data-testid="input-contact" />
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
                          <FormLabel>{t('relatedUserLabel')}</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}
                            value={field.value || "none"}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-user">
                                <SelectValue placeholder={t('selectClientUserPlaceholder')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">{t('notAssignedOption')}</SelectItem>
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
                            <FormLabel className="text-base">{t('activeFormLabel')}</FormLabel>
                            <div className="text-sm" style={{ color: 'var(--corp-muted)' }}>
                              {t('activeClientHint')}
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
                        {t('cancelLabel')}
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
                        {editingClient ? t('updateLabel') : t('createLabel2')}
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
            <TabsTrigger value="active" data-testid="tab-active">{t('activeTabLabel')}</TabsTrigger>
            <TabsTrigger value="deleted" data-testid="tab-deleted">{t('deletedTabLabel')}</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-3">
            {clientsArr.length === 0 ? (
              <CorpEmpty
                icon={<Building2 size={28} />}
                title={t('noClientsFound')}
                description={t('addFirstClient')}
                actionLabel={canManage ? t('addClientLabel') : undefined}
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
                title={t('noDeletedClients')}
                description={t('allDeletedClientsHere')}
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
