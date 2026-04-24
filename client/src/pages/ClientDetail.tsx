import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import {
  Plus, Edit2, Trash2, Building2, Phone, Mail, MapPin,
  CreditCard, FileText, Calendar, DollarSign, User, Users
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientProjectSchema, insertClientPaymentSchema, type InsertClientProject, type InsertClientPayment } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { CorpHeader, MoneyAED, fmtDateRu } from "@/components/corp-ui";

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

function StatCard({ label, value, icon, tone = 'ink' }: {
  label: string;
  value: React.ReactNode;
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
      <div className="flex items-start justify-between mb-2">
        <span className="text-[11px]" style={{ color: 'var(--corp-muted)' }}>{label}</span>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="text-[20px] font-bold" style={{ color, fontFamily: 'var(--corp-mono)' }}>
        {value}
      </div>
    </div>
  );
}

export default function ClientDetailPage() {
  const [, params] = useRoute("/clients/:id");
  const [, setLocation] = useLocation();
  const clientId = params?.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isEditProjectDialogOpen, setIsEditProjectDialogOpen] = useState(false);
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ["/api/clients", clientId],
    enabled: !!clientId,
  });

  const { data: clientStats } = useQuery({
    queryKey: ["/api/clients", clientId, "stats"],
    enabled: !!clientId,
  });

  const { data: clientProjects } = useQuery({
    queryKey: ["/api/clients", clientId, "projects"],
    enabled: !!clientId,
  });

  const { data: clientPayments } = useQuery({
    queryKey: ["/api/clients", clientId, "payments"],
    enabled: !!clientId,
  });

  const { data: allProjects } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: clientUsers = [] } = useQuery({
    queryKey: ["/api/users", "client"],
    queryFn: async () => {
      const response = await apiRequest("/api/users?role=client", { method: "GET" });
      return response.json();
    },
  });

  const { data: assignedEmployees = [] } = useQuery({
    queryKey: ["/api/clients", clientId, "employees"],
    queryFn: async () => {
      const response = await apiRequest(`/api/clients/${clientId}/employees`, { method: "GET" });
      return response.json();
    },
    enabled: !!clientId,
  });

  const safeClient = client as any;
  const safeStats = clientStats as any || { totalProjects: 0, totalPayments: 0, remainingAmount: 0 };
  const safeClientProjects = clientProjects as any[] || [];
  const safeClientPayments = clientPayments as any[] || [];
  const safeAllProjects = allProjects as any[] || [];

  const projectForm = useForm<InsertClientProject>({
    resolver: zodResolver(insertClientProjectSchema),
    mode: "onChange",
    defaultValues: {
      clientId: clientId || "",
      projectId: "",
      contractAmount: undefined,
      contractNumber: "",
      contractDate: undefined,
      description: "",
      status: "active",
    },
  });

  const paymentForm = useForm<InsertClientPayment>({
    resolver: zodResolver(insertClientPaymentSchema),
    defaultValues: {
      clientId: clientId || "",
      projectId: "",
      amount: undefined,
      description: "",
      paymentDate: new Date(),
      paymentMethod: "",
    },
  });

  const editProjectForm = useForm<InsertClientProject>({
    resolver: zodResolver(insertClientProjectSchema),
    defaultValues: {
      clientId: clientId || "",
      projectId: "",
      contractAmount: undefined,
      contractNumber: "",
      contractDate: undefined,
      description: "",
      status: "active",
    },
  });

  const assignProjectMutation = useMutation({
    mutationFn: async (data: InsertClientProject) => {
      const response = await fetch(`/api/clients/${clientId}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to assign project: ${error}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-client-projects"] });
      setIsProjectDialogOpen(false);
      projectForm.reset();
      toast({ title: "Проект назначен успешно" });
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: `Не удалось назначить проект: ${error.message}`, variant: "destructive" });
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: InsertClientPayment) => {
      const response = await fetch("/api/client-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create payment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "stats"] });
      setIsPaymentDialogOpen(false);
      paymentForm.reset();
      toast({ title: "Платеж добавлен успешно" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось добавить платеж", variant: "destructive" });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<InsertClientProject> }) => {
      const response = await fetch(`/api/clients/${clientId}/projects/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data.updates),
      });
      if (!response.ok) throw new Error("Failed to update project");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-client-projects"] });
      setIsEditProjectDialogOpen(false);
      setEditingProject(null);
      editProjectForm.reset();
      toast({ title: "Проект обновлен успешно" });
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: `Не удалось обновить проект: ${error.message}`, variant: "destructive" });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const response = await fetch(`/api/client-payments/${paymentId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete payment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "stats"] });
      toast({ title: "Платеж удален успешно" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось удалить платеж", variant: "destructive" });
    },
  });

  const removeProjectMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const response = await fetch(`/api/client-projects/${assignmentId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to remove project");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-client-projects"] });
      toast({ title: "Проект отвязан успешно" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось отвязать проект", variant: "destructive" });
    },
  });

  const assignEmployeesMutation = useMutation({
    mutationFn: async (employeeIds: string[]) => {
      const response = await apiRequest(`/api/clients/${clientId}/employees`, {
        method: "POST",
        body: JSON.stringify({ employeeIds }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "employees"] });
      setIsEmployeeDialogOpen(false);
      setSelectedEmployees([]);
      toast({ title: "Сотрудники назначены успешно" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось назначить сотрудников", variant: "destructive" });
    },
  });

  const removeEmployeeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest(`/api/clients/${clientId}/employees/${userId}`, { method: "DELETE" });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "employees"] });
      toast({ title: "Сотрудник отвязан успешно" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось отвязать сотрудника", variant: "destructive" });
    },
  });

  const handleEmployeeToggle = (userId: string, checked: boolean) => {
    if (checked) setSelectedEmployees(prev => [...prev, userId]);
    else setSelectedEmployees(prev => prev.filter(id => id !== userId));
  };

  const onEmployeeAssignSubmit = () => {
    if (selectedEmployees.length > 0) assignEmployeesMutation.mutate(selectedEmployees);
  };

  const onProjectSubmit = (data: InsertClientProject) => {
    assignProjectMutation.mutate({ ...data, clientId: clientId! });
  };

  const onPaymentSubmit = (data: InsertClientPayment) => {
    createPaymentMutation.mutate(data);
  };

  const onEditProjectSubmit = (data: InsertClientProject) => {
    if (editingProject) {
      updateProjectMutation.mutate({ id: editingProject.id, updates: data });
    }
  };

  const handleEditProject = (project: any) => {
    setEditingProject(project);
    editProjectForm.reset({
      clientId: project.clientId,
      projectId: project.projectId,
      contractAmount: project.contractAmount || undefined,
      contractNumber: project.contractNumber || "",
      contractDate: project.contractDate ? new Date(project.contractDate) : undefined,
      description: project.description || "",
      status: project.status || "active",
    });
    setIsEditProjectDialogOpen(true);
  };

  const handleDeletePayment = (paymentId: string) => {
    if (window.confirm("Вы уверены, что хотите удалить этот платеж?")) {
      deletePaymentMutation.mutate(paymentId);
    }
  };

  const handleRemoveProject = (assignmentId: string, projectName: string) => {
    if (window.confirm(`Вы уверены, что хотите отвязать проект "${projectName}"?`)) {
      removeProjectMutation.mutate(assignmentId);
    }
  };

  if (clientLoading || !safeClient) {
    return <div className="min-h-screen" style={{ background: 'var(--corp-bg)' }} />;
  }

  const canManage = user?.role === 'admin' || user?.role === 'director';

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--corp-bg)' }} data-page-header>
      <CorpHeader
        title={safeClient?.name || 'Заказчик'}
        subtitle={safeClient?.company || undefined}
        onBack={() => setLocation('/clients')}
        action={<StatusBadge tone={safeClient?.isActive ? 'pos' : 'neutral'}>{safeClient?.isActive ? 'Активный' : 'Неактивный'}</StatusBadge>}
      />

      <div className="p-4 space-y-4">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCard
            label="Всего проектов"
            value={safeStats.totalProjects}
            icon={<FileText size={16} />}
            tone="accent"
          />
          <StatCard
            label="Общая сумма платежей"
            value={<MoneyAED amount={safeStats.totalPayments} size={20} weight={700} tone="pos" />}
            icon={<DollarSign size={16} />}
            tone="pos"
          />
          <StatCard
            label="Остаток к доплате"
            value={<MoneyAED amount={safeStats.remainingAmount} size={20} weight={700} tone={safeStats.remainingAmount > 0 ? 'warn' : 'pos'} />}
            icon={<CreditCard size={16} />}
            tone={safeStats.remainingAmount > 0 ? 'warn' : 'pos'}
          />
        </div>

        {/* Client Information */}
        <div className="p-4" style={SECTION_STYLE}>
          <h3 className="text-[14px] font-bold mb-3" style={{ color: 'var(--corp-ink)' }}>Информация о заказчике</h3>
          <div className="grid gap-3 md:grid-cols-2 text-[13px]">
            {safeClient?.contactPerson && (
              <div className="flex items-center gap-2" style={{ color: 'var(--corp-ink-2)' }}>
                <User size={15} style={{ color: 'var(--corp-ink-3)' }} />
                <span><span style={{ color: 'var(--corp-muted)' }}>Контактное лицо:</span> {safeClient.contactPerson}</span>
              </div>
            )}
            {safeClient?.phone && (
              <div className="flex items-center gap-2" style={{ color: 'var(--corp-ink-2)' }}>
                <Phone size={15} style={{ color: 'var(--corp-ink-3)' }} />
                <span style={{ fontFamily: 'var(--corp-mono)' }}>{safeClient.phone}</span>
              </div>
            )}
            {safeClient?.email && (
              <div className="flex items-center gap-2" style={{ color: 'var(--corp-ink-2)' }}>
                <Mail size={15} style={{ color: 'var(--corp-ink-3)' }} />
                <span style={{ fontFamily: 'var(--corp-mono)' }}>{safeClient.email}</span>
              </div>
            )}
            {safeClient?.address && (
              <div className="flex items-start gap-2 md:col-span-2" style={{ color: 'var(--corp-ink-2)' }}>
                <MapPin size={15} style={{ color: 'var(--corp-ink-3)', marginTop: 2 }} />
                <span><span style={{ color: 'var(--corp-muted)' }}>Адрес:</span> {safeClient.address}</span>
              </div>
            )}
          </div>
        </div>

        <Tabs defaultValue="projects" className="space-y-4">
          <TabsList>
            <TabsTrigger value="projects">Проекты</TabsTrigger>
            <TabsTrigger value="payments">Платежи</TabsTrigger>
            <TabsTrigger value="employees">Сотрудники</TabsTrigger>
          </TabsList>

          {/* Projects tab */}
          <TabsContent value="projects" className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-[14px] font-bold" style={{ color: 'var(--corp-ink)' }}>Проекты заказчика</h3>
              {canManage && (
                <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 h-9 px-3 text-[12px] font-semibold transition-colors"
                      style={PRIMARY_BTN}
                    >
                      <Plus size={14} /> Назначить проект
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Назначить проект заказчику</DialogTitle>
                    </DialogHeader>
                    <Form {...projectForm}>
                      <form onSubmit={projectForm.handleSubmit(onProjectSubmit)} className="space-y-4">
                        <FormField
                          control={projectForm.control}
                          name="projectId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Проект *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Выберите проект" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {safeAllProjects.length === 0 ? (
                                    <div className="p-2 text-[12px]" style={{ color: 'var(--corp-muted)' }}>Нет доступных проектов</div>
                                  ) : (
                                    safeAllProjects.map((project: any) => (
                                      <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={projectForm.control}
                            name="contractAmount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Сумма договора, AED</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number" step="0.01" placeholder="0.00"
                                    className="h-12 text-[18px] font-bold"
                                    style={{ fontFamily: 'var(--corp-mono)', color: 'var(--corp-accent)' }}
                                    {...field}
                                    value={field.value || ""}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={projectForm.control}
                            name="contractNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Номер договора</FormLabel>
                                <FormControl>
                                  <Input placeholder="№ договора" {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={projectForm.control}
                          name="contractDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Дата договора</FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  {...field}
                                  value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                                  onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={projectForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Описание работ</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Описание работ по договору" {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setIsProjectDialogOpen(false)}
                            className="flex-1 h-10 text-[13px] font-semibold"
                            style={GHOST_BTN}
                          >
                            Отмена
                          </button>
                          <button
                            type="submit"
                            disabled={assignProjectMutation.isPending || !projectForm.watch('projectId')}
                            className="flex-1 h-10 text-[13px] font-semibold disabled:opacity-50"
                            style={PRIMARY_BTN}
                          >
                            {assignProjectMutation.isPending ? "Назначение..." : "Назначить"}
                          </button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            <div className="space-y-3">
              {safeClientProjects.map((project: any) => {
                const remaining = project.contractAmount
                  ? parseFloat(project.contractAmount.toString()) - parseFloat(project.totalPaid || '0')
                  : null;
                return (
                  <div key={project.id} className="p-4" style={SECTION_STYLE}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Building2 size={16} style={{ color: 'var(--corp-accent)' }} />
                        <h4 className="text-[14px] font-semibold truncate" style={{ color: 'var(--corp-ink)' }}>{project.projectName}</h4>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <StatusBadge tone={project.status === 'active' ? 'pos' : 'neutral'}>
                          {project.status === 'active' ? 'Активный' : 'Завершен'}
                        </StatusBadge>
                        {canManage && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleEditProject(project)}
                              className="w-8 h-8 flex items-center justify-center rounded"
                              style={{ color: 'var(--corp-accent)' }}
                              title="Редактировать"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveProject(project.id, project.projectName)}
                              className="w-8 h-8 flex items-center justify-center rounded"
                              style={{ color: 'var(--corp-neg)' }}
                              title="Отвязать"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="p-2.5" style={{ background: 'var(--corp-surface-2)', borderRadius: 'var(--corp-r)' }}>
                        <div className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>Стоимость</div>
                        <MoneyAED amount={project.totalCost || '0'} size={14} weight={700} tone="ink" />
                      </div>
                      <div className="p-2.5" style={{ background: 'var(--corp-surface-2)', borderRadius: 'var(--corp-r)' }}>
                        <div className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>Сумма договора</div>
                        {project.contractAmount
                          ? <MoneyAED amount={project.contractAmount} size={14} weight={700} tone="ink" />
                          : <span className="text-[12px]" style={{ color: 'var(--corp-muted)' }}>Не указана</span>}
                      </div>
                      <div className="p-2.5" style={{ background: 'var(--corp-surface-2)', borderRadius: 'var(--corp-r)' }}>
                        <div className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>Оплачено</div>
                        <MoneyAED amount={project.totalPaid || '0'} size={14} weight={700} tone="pos" />
                      </div>
                      <div className="p-2.5" style={{ background: 'var(--corp-surface-2)', borderRadius: 'var(--corp-r)' }}>
                        <div className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>К доплате</div>
                        {remaining !== null
                          ? <MoneyAED amount={remaining} size={14} weight={700} tone={remaining > 0 ? 'neg' : 'pos'} />
                          : <span className="text-[12px]" style={{ color: 'var(--corp-muted)' }}>—</span>}
                      </div>
                    </div>

                    {(project.contractNumber || project.contractDate || project.description) && (
                      <div className="text-[12px] space-y-1">
                        {project.contractNumber && (
                          <p style={{ color: 'var(--corp-ink-3)' }}>
                            <span style={{ color: 'var(--corp-muted)' }}>Номер договора:</span>{' '}
                            <span style={{ fontFamily: 'var(--corp-mono)' }}>{project.contractNumber}</span>
                          </p>
                        )}
                        {project.contractDate && (
                          <p style={{ color: 'var(--corp-ink-3)' }}>
                            <span style={{ color: 'var(--corp-muted)' }}>Дата:</span>{' '}
                            <span style={{ fontFamily: 'var(--corp-mono)' }}>{fmtDateRu(project.contractDate)}</span>
                          </p>
                        )}
                        {project.description && (
                          <p style={{ color: 'var(--corp-ink-3)' }}>{project.description}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {(!safeClientProjects || safeClientProjects.length === 0) && (
                <div className="p-8 text-center" style={SECTION_STYLE}>
                  <FileText size={28} className="mx-auto mb-2" style={{ color: 'var(--corp-muted)' }} />
                  <p className="text-[13px]" style={{ color: 'var(--corp-muted)' }}>Проекты не назначены</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Payments tab */}
          <TabsContent value="payments" className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-[14px] font-bold" style={{ color: 'var(--corp-ink)' }}>Платежи заказчика</h3>
              {canManage && (
                <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 h-9 px-3 text-[12px] font-semibold transition-colors"
                      style={PRIMARY_BTN}
                    >
                      <Plus size={14} /> Добавить платеж
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Добавить платеж</DialogTitle>
                    </DialogHeader>
                    <Form {...paymentForm}>
                      <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-4">
                        <FormField
                          control={paymentForm.control}
                          name="projectId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Проект *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger><SelectValue placeholder="Выберите проект" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {safeClientProjects.map((project: any) => (
                                    <SelectItem key={project.projectId} value={project.projectId}>{project.projectName}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={paymentForm.control}
                            name="amount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Сумма платежа, AED *</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number" step="0.01" placeholder="0.00"
                                    className="h-12 text-[18px] font-bold"
                                    style={{ fontFamily: 'var(--corp-mono)', color: 'var(--corp-pos)' }}
                                    {...field}
                                    value={field.value || ""}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={paymentForm.control}
                            name="paymentDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Дата платежа *</FormLabel>
                                <FormControl>
                                  <Input
                                    type="date" {...field}
                                    value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                                    onChange={(e) => field.onChange(new Date(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={paymentForm.control}
                          name="paymentMethod"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Способ оплаты</FormLabel>
                              <FormControl>
                                <Input placeholder="Банковский перевод, наличные и т.д." {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={paymentForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Описание</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Описание платежа" {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex gap-2 pt-2">
                          <button type="button" onClick={() => setIsPaymentDialogOpen(false)} className="flex-1 h-10 text-[13px] font-semibold" style={GHOST_BTN}>
                            Отмена
                          </button>
                          <button type="submit" disabled={createPaymentMutation.isPending} className="flex-1 h-10 text-[13px] font-semibold disabled:opacity-50" style={PRIMARY_BTN}>
                            {createPaymentMutation.isPending ? 'Добавление...' : 'Добавить'}
                          </button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            <div className="space-y-3">
              {safeClientPayments.map((payment: any) => (
                <div key={payment.id} className="p-4" style={SECTION_STYLE}>
                  <div className="flex justify-between items-start gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <CreditCard size={15} style={{ color: 'var(--corp-pos)' }} />
                        <MoneyAED amount={payment.amount} size={16} weight={700} tone="pos" />
                      </div>
                      <p className="text-[12px]" style={{ color: 'var(--corp-ink-3)' }}>
                        Проект: <span style={{ color: 'var(--corp-ink-2)' }}>{payment.projectName}</span>
                      </p>
                      <div className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--corp-muted)' }}>
                        <Calendar size={12} />
                        <span style={{ fontFamily: 'var(--corp-mono)' }}>{fmtDateRu(payment.paymentDate)}</span>
                      </div>
                      {payment.paymentMethod && (
                        <p className="text-[12px]" style={{ color: 'var(--corp-ink-3)' }}>
                          <span style={{ color: 'var(--corp-muted)' }}>Способ:</span> {payment.paymentMethod}
                        </p>
                      )}
                      {payment.description && (
                        <p className="text-[12px]" style={{ color: 'var(--corp-ink-3)' }}>{payment.description}</p>
                      )}
                    </div>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => handleDeletePayment(payment.id)}
                        className="w-8 h-8 flex items-center justify-center rounded flex-shrink-0"
                        style={{ color: 'var(--corp-neg)' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {(!safeClientPayments || safeClientPayments.length === 0) && (
                <div className="p-8 text-center" style={SECTION_STYLE}>
                  <CreditCard size={28} className="mx-auto mb-2" style={{ color: 'var(--corp-muted)' }} />
                  <p className="text-[13px]" style={{ color: 'var(--corp-muted)' }}>Платежи не найдены</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Employees tab */}
          <TabsContent value="employees" className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-[14px] font-bold" style={{ color: 'var(--corp-ink)' }}>Сотрудники заказчика</h3>
              <Dialog open={isEmployeeDialogOpen} onOpenChange={setIsEmployeeDialogOpen}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 h-9 px-3 text-[12px] font-semibold transition-colors"
                    style={PRIMARY_BTN}
                  >
                    <Users size={14} /> Назначить сотрудников
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Назначить сотрудников заказчика</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-[12px]" style={{ color: 'var(--corp-muted)' }}>
                      Выберите пользователей с ролью «client» для назначения к заказчику:
                    </p>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {clientUsers.length === 0 ? (
                        <div className="text-center py-4 text-[13px]" style={{ color: 'var(--corp-muted)' }}>
                          Пользователи с ролью «client» не найдены
                        </div>
                      ) : (
                        clientUsers.map((u: any) => {
                          const isAlreadyAssigned = assignedEmployees.some((emp: any) => emp.id === u.id);
                          const isSelected = selectedEmployees.includes(u.id);
                          return (
                            <div
                              key={u.id}
                              className="flex items-center gap-3 p-3"
                              style={{ background: 'var(--corp-surface-2)', borderRadius: 'var(--corp-r)' }}
                            >
                              <Checkbox
                                id={`user-${u.id}`}
                                checked={isSelected}
                                onCheckedChange={(checked) => handleEmployeeToggle(u.id, checked as boolean)}
                                disabled={isAlreadyAssigned}
                              />
                              <div className="flex-1">
                                <label htmlFor={`user-${u.id}`} className="text-[13px] font-semibold cursor-pointer" style={{ color: 'var(--corp-ink)' }}>
                                  {u.name}
                                </label>
                                <p className="text-[11px]" style={{ color: 'var(--corp-muted)', fontFamily: 'var(--corp-mono)' }}>@{u.username}</p>
                                {isAlreadyAssigned && (
                                  <div className="mt-1"><StatusBadge>Уже назначен</StatusBadge></div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => { setIsEmployeeDialogOpen(false); setSelectedEmployees([]); }}
                        className="flex-1 h-10 text-[13px] font-semibold"
                        style={GHOST_BTN}
                      >
                        Отмена
                      </button>
                      <button
                        type="button"
                        onClick={onEmployeeAssignSubmit}
                        disabled={selectedEmployees.length === 0 || assignEmployeesMutation.isPending}
                        className="flex-1 h-10 text-[13px] font-semibold disabled:opacity-50"
                        style={PRIMARY_BTN}
                      >
                        {assignEmployeesMutation.isPending ? "Назначение..." : `Назначить (${selectedEmployees.length})`}
                      </button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-3">
              {assignedEmployees.map((employee: any) => (
                <div key={employee.id} className="p-4" style={SECTION_STYLE}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--corp-surface-2)', color: 'var(--corp-ink-3)' }}
                      >
                        <User size={18} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[13px] font-semibold truncate" style={{ color: 'var(--corp-ink)' }}>{employee.name}</h4>
                        <p className="text-[11px]" style={{ color: 'var(--corp-muted)', fontFamily: 'var(--corp-mono)' }}>@{employee.username}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEmployeeMutation.mutate(employee.id)}
                      disabled={removeEmployeeMutation.isPending}
                      className="inline-flex items-center gap-1 h-8 px-3 text-[11px] font-semibold disabled:opacity-50"
                      style={DANGER_BTN}
                    >
                      <Trash2 size={12} /> Отвязать
                    </button>
                  </div>
                </div>
              ))}
              {(!assignedEmployees || assignedEmployees.length === 0) && (
                <div className="p-8 text-center" style={SECTION_STYLE}>
                  <Users size={28} className="mx-auto mb-2" style={{ color: 'var(--corp-muted)' }} />
                  <p className="text-[13px]" style={{ color: 'var(--corp-muted)' }}>Сотрудники не назначены</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Project Dialog */}
      <Dialog open={isEditProjectDialogOpen} onOpenChange={setIsEditProjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать информацию о проекте</DialogTitle>
          </DialogHeader>
          <Form {...editProjectForm}>
            <form onSubmit={editProjectForm.handleSubmit(onEditProjectSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editProjectForm.control}
                  name="contractAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Сумма договора, AED</FormLabel>
                      <FormControl>
                        <Input
                          type="number" step="0.01" placeholder="0.00"
                          className="h-12 text-[18px] font-bold"
                          style={{ fontFamily: 'var(--corp-mono)', color: 'var(--corp-accent)' }}
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editProjectForm.control}
                  name="contractNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Номер договора</FormLabel>
                      <FormControl>
                        <Input placeholder="Введите номер договора" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editProjectForm.control}
                name="contractDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дата договора</FormLabel>
                    <FormControl>
                      <Input
                        type="date" {...field}
                        value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editProjectForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Дополнительная информация" rows={3} {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editProjectForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Статус</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Выберите статус" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Активный</SelectItem>
                        <SelectItem value="completed">Завершен</SelectItem>
                        <SelectItem value="paused">Приостановлен</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsEditProjectDialogOpen(false)} className="flex-1 h-10 text-[13px] font-semibold" style={GHOST_BTN}>
                  Отмена
                </button>
                <button type="submit" disabled={updateProjectMutation.isPending} className="flex-1 h-10 text-[13px] font-semibold disabled:opacity-50" style={PRIMARY_BTN}>
                  {updateProjectMutation.isPending ? "Сохранение..." : "Сохранить"}
                </button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
