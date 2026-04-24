import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertToolSchema, insertToolMovementSchema, type Tool, type ToolMovement } from "@shared/schema";
import { z } from "zod";
import { Plus, Search, Camera, User, Package, ArrowUpDown, Eye, MoreVertical, Edit, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CorpHeader, MoneyAED, CorpEmpty, fmtDateRu } from "@/components/corp-ui";

interface ToolWithPerson extends Tool {
  currentPerson?: { name: string; phone: string };
}

type FilterStatus = 'all' | 'available' | 'out' | 'written_off';

const createToolFormSchema = insertToolSchema.extend({
  cost: z.union([z.number(), z.string().transform((str) => parseFloat(str || "0"))]),
  inventoryNumber: z.string().optional(),
  description: z.string().optional(),
});

const toolMovementFormSchema = insertToolMovementSchema.omit({
  toolId: true,
  createdBy: true,
  photoUrl: true,
}).extend({
  type: z.enum(['ISSUE', 'RETURN']),
  eventTime: z.string().optional(),
  comment: z.string().optional(),
});

const SECTION_STYLE: React.CSSProperties = {
  background: 'var(--corp-surface)',
  border: '1px solid var(--corp-line)',
  borderRadius: 'var(--corp-r-lg)',
};

function StatusPill({ status }: { status: string | null }) {
  const cfg =
    status === 'AVAILABLE' ? { bg: 'rgba(22,163,74,0.10)', color: 'var(--corp-pos)', text: 'В наличии' } :
    status === 'OUT' ? { bg: 'rgba(245,158,11,0.10)', color: 'var(--corp-warn, #f59e0b)', text: 'У человека' } :
    status === 'WRITTEN_OFF' ? { bg: 'rgba(220,38,38,0.10)', color: 'var(--corp-neg)', text: 'Списан' } :
    { bg: 'var(--corp-surface-2)', color: 'var(--corp-ink-3)', text: status || '—' };
  return (
    <span
      className="inline-flex items-center px-2 h-5 text-[10px] font-bold uppercase"
      style={{
        background: cfg.bg,
        color: cfg.color,
        borderRadius: 'var(--corp-r-sm)',
        letterSpacing: '0.04em',
      }}
    >
      {cfg.text}
    </span>
  );
}

function FilterTab({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 h-8 px-3 text-[12px] font-semibold transition-colors whitespace-nowrap"
      style={{
        background: active ? 'var(--corp-ink)' : 'var(--corp-surface-2)',
        color: active ? '#fff' : 'var(--corp-ink-2)',
        borderRadius: 'var(--corp-r-sm)',
      }}
    >
      {label}
      {typeof count === 'number' && (
        <span
          className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px]"
          style={{
            background: active ? 'rgba(255,255,255,0.18)' : 'var(--corp-surface)',
            color: active ? '#fff' : 'var(--corp-ink-3)',
            borderRadius: 'var(--corp-r-sm)',
            fontFamily: 'var(--corp-mono)',
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export default function Tools() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<ToolWithPerson | null>(null);
  const [isToolDetailOpen, setIsToolDetailOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementTool, setMovementTool] = useState<ToolWithPerson | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<ToolWithPerson | null>(null);

  const form = useForm<z.infer<typeof createToolFormSchema>>({
    resolver: zodResolver(createToolFormSchema),
    defaultValues: {
      name: "",
      inventoryNumber: undefined,
      cost: 0,
      description: undefined,
    },
  });

  const movementForm = useForm<z.infer<typeof toolMovementFormSchema>>({
    resolver: zodResolver(toolMovementFormSchema),
    defaultValues: {
      type: 'ISSUE',
      personName: "",
      personPhone: "",
      comment: undefined,
      eventTime: new Date().toISOString().slice(0, 16),
    },
  });

  const { data: tools = [], isLoading } = useQuery<ToolWithPerson[]>({
    queryKey: ['/api/tools'],
  });

  const createToolMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createToolFormSchema>) => {
      const res = await apiRequest('/api/tools', { method: 'POST', body: JSON.stringify(data) });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tools'] });
      setIsCreateModalOpen(false);
      form.reset();
      toast({ title: "Инструмент создан" });
    },
    onError: () => {
      toast({ title: "Ошибка создания инструмента", variant: "destructive" });
    },
  });

  const createMovementMutation = useMutation({
    mutationFn: async (data: z.infer<typeof toolMovementFormSchema>) => {
      if (!movementTool || !selectedFile) {
        throw new Error("Инструмент или фото не выбраны");
      }
      const formData = new FormData();
      formData.append('type', data.type);
      formData.append('personName', data.personName);
      formData.append('personPhone', data.personPhone);
      if (data.eventTime) formData.append('eventTime', new Date(data.eventTime).toISOString());
      if (data.comment) formData.append('comment', data.comment);
      formData.append('photo', selectedFile);

      const res = await fetch(`/api/tools/${movementTool.id}/movements`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error(`Ошибка: ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tools'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tools', movementTool?.id, 'movements'] });
      setIsMovementModalOpen(false);
      setMovementTool(null);
      setSelectedFile(null);
      movementForm.reset();
      toast({ title: "Движение записано" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка записи движения", description: error.message, variant: "destructive" });
    },
  });

  const editToolMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createToolFormSchema>) => {
      if (!editingTool) return;
      const res = await apiRequest(`/api/tools/${editingTool.id}`, { method: 'PATCH', body: JSON.stringify(data) });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tools'] });
      setIsEditModalOpen(false);
      setEditingTool(null);
      form.reset();
      toast({ title: "Инструмент обновлен" });
    },
    onError: () => {
      toast({ title: "Ошибка обновления инструмента", variant: "destructive" });
    },
  });

  const deleteToolMutation = useMutation({
    mutationFn: async (toolId: string) => {
      const res = await apiRequest(`/api/tools/${toolId}`, { method: 'DELETE' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tools'] });
      toast({ title: "Инструмент удален" });
    },
    onError: () => {
      toast({ title: "Ошибка удаления инструмента", variant: "destructive" });
    },
  });

  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tool.currentPerson?.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tool.currentPerson?.phone.includes(searchQuery));

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'available' && tool.status === 'AVAILABLE') ||
      (filterStatus === 'out' && tool.status === 'OUT') ||
      (filterStatus === 'written_off' && tool.status === 'WRITTEN_OFF');

    return matchesSearch && matchesStatus;
  });

  const counts = {
    all: tools.length,
    available: tools.filter(t => t.status === 'AVAILABLE').length,
    out: tools.filter(t => t.status === 'OUT').length,
    written_off: tools.filter(t => t.status === 'WRITTEN_OFF').length,
  };

  const handleCreateTool = (data: z.infer<typeof createToolFormSchema>) => {
    createToolMutation.mutate(data);
  };

  const handleEditTool = (data: z.infer<typeof createToolFormSchema>) => {
    editToolMutation.mutate(data);
  };

  const handleMovementSubmit = (data: z.infer<typeof toolMovementFormSchema>) => {
    createMovementMutation.mutate(data);
  };

  const openToolDetail = (tool: ToolWithPerson) => {
    setSelectedTool(tool);
    setIsToolDetailOpen(true);
  };

  const openMovementModal = (tool: ToolWithPerson) => {
    setMovementTool(tool);
    const type = tool.status === 'AVAILABLE' ? 'ISSUE' : 'RETURN';
    movementForm.setValue('type', type);
    setIsMovementModalOpen(true);
  };

  const openEditModal = (tool: ToolWithPerson) => {
    setEditingTool(tool);
    form.setValue('name', tool.name);
    form.setValue('inventoryNumber', tool.inventoryNumber || '');
    form.setValue('cost', parseFloat(tool.cost));
    form.setValue('description', tool.description || '');
    setIsEditModalOpen(true);
  };

  const handleDelete = (toolId: string) => {
    if (confirm('Вы уверены, что хотите удалить этот инструмент?')) {
      deleteToolMutation.mutate(toolId);
    }
  };

  const canManage = user?.role === 'admin' || user?.role === 'director' || user?.role === 'master';

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--corp-bg)' }} data-page-header>
      <CorpHeader
        title="Инструменты"
        onBack={() => setLocation('/director')}
        action={
          canManage ? (
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 h-9 px-3 text-[12px] font-semibold transition-colors"
                  style={{ background: 'var(--corp-accent)', color: '#fff', borderRadius: 'var(--corp-r)' }}
                  data-testid="button-add-tool"
                >
                  <Plus size={14} /> Добавить
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Создать инструмент</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleCreateTool)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Название инструмента *</FormLabel>
                          <FormControl>
                            <Input placeholder="Например: Дрель Bosch" {...field} data-testid="input-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="inventoryNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Инвентарный номер</FormLabel>
                          <FormControl>
                            <Input placeholder="Например: DR-001" {...field} data-testid="input-inventory" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Стоимость, AED</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0"
                              className="h-12 text-[18px] font-bold"
                              style={{ fontFamily: 'var(--corp-mono)', color: 'var(--corp-accent)' }}
                              {...field}
                              data-testid="input-cost"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Описание</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Дополнительная информация..." {...field} data-testid="input-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(false)}
                        className="flex-1 h-10 text-[13px] font-semibold transition-colors"
                        style={{ background: 'var(--corp-surface-2)', color: 'var(--corp-ink-2)', borderRadius: 'var(--corp-r)' }}
                        data-testid="button-cancel-create"
                      >
                        Отмена
                      </button>
                      <button
                        type="submit"
                        disabled={createToolMutation.isPending}
                        className="flex-1 h-10 text-[13px] font-semibold transition-colors disabled:opacity-50"
                        style={{ background: 'var(--corp-accent)', color: '#fff', borderRadius: 'var(--corp-r)' }}
                        data-testid="button-save-create"
                      >
                        {createToolMutation.isPending ? "Создание..." : "Создать"}
                      </button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          ) : undefined
        }
      />

      <div className="p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
            style={{ color: 'var(--corp-ink-3)' }}
          />
          <Input
            placeholder="Поиск по названию, имени или телефону..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10"
            data-testid="input-search"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <FilterTab active={filterStatus === 'all'} onClick={() => setFilterStatus('all')} label="Все" count={counts.all} />
          <FilterTab active={filterStatus === 'available'} onClick={() => setFilterStatus('available')} label="В наличии" count={counts.available} />
          <FilterTab active={filterStatus === 'out'} onClick={() => setFilterStatus('out')} label="В работе" count={counts.out} />
          <FilterTab active={filterStatus === 'written_off'} onClick={() => setFilterStatus('written_off')} label="Списанные" count={counts.written_off} />
        </div>

        {/* Tools Grid */}
        {isLoading ? (
          <div className="py-8" />
        ) : filteredTools.length === 0 ? (
          <CorpEmpty
            icon={<Package size={28} />}
            title={searchQuery || filterStatus !== 'all' ? 'Инструменты не найдены' : 'Нет инструментов'}
            description={searchQuery || filterStatus !== 'all' ? 'Попробуйте изменить фильтры' : 'Добавьте первый инструмент'}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTools.map((tool) => (
              <div key={tool.id} className="p-4 transition-shadow hover:shadow-md" style={SECTION_STYLE} data-testid={`card-tool-${tool.id}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[14px] font-semibold truncate" style={{ color: 'var(--corp-ink)' }}>
                      {tool.name}
                    </h3>
                    {tool.inventoryNumber && (
                      <p className="text-[11px]" style={{ color: 'var(--corp-muted)', fontFamily: 'var(--corp-mono)' }}>
                        № {tool.inventoryNumber}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusPill status={tool.status} />
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="h-7 w-7 flex items-center justify-center rounded transition-colors"
                            style={{ color: 'var(--corp-ink-3)' }}
                            data-testid={`button-menu-${tool.id}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditModal(tool)} data-testid={`menu-edit-${tool.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(tool.id)}
                            style={{ color: 'var(--corp-neg)' }}
                            data-testid={`menu-delete-${tool.id}`}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mt-3">
                  <div className="flex items-center gap-2">
                    <Package className="h-3.5 w-3.5" style={{ color: 'var(--corp-ink-3)' }} />
                    <MoneyAED amount={parseFloat(tool.cost) || 0} size={13} weight={600} tone="ink" />
                  </div>

                  {tool.status === 'OUT' && tool.currentPerson && (
                    <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--corp-ink-2)' }}>
                      <User className="h-3.5 w-3.5" style={{ color: 'var(--corp-ink-3)' }} />
                      <span className="truncate">
                        {tool.currentPerson.name}
                        <span style={{ color: 'var(--corp-muted)', fontFamily: 'var(--corp-mono)' }}>
                          {' '}({tool.currentPerson.phone})
                        </span>
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => openToolDetail(tool)}
                      className="flex-1 inline-flex items-center justify-center gap-1 h-8 text-[12px] font-semibold transition-colors"
                      style={{ background: 'var(--corp-surface-2)', color: 'var(--corp-ink-2)', borderRadius: 'var(--corp-r-sm)' }}
                      data-testid={`button-detail-${tool.id}`}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Детали
                    </button>
                    <button
                      type="button"
                      onClick={() => openMovementModal(tool)}
                      className="flex-1 inline-flex items-center justify-center gap-1 h-8 text-[12px] font-semibold transition-colors"
                      style={{
                        background: tool.status === 'AVAILABLE' ? 'var(--corp-accent)' : 'var(--corp-ink)',
                        color: '#fff',
                        borderRadius: 'var(--corp-r-sm)',
                      }}
                      data-testid={`button-movement-${tool.id}`}
                    >
                      <ArrowUpDown className="h-3.5 w-3.5" />
                      {tool.status === 'AVAILABLE' ? 'Выдать' : 'Вернуть'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tool Detail Dialog */}
      <ToolDetailDialog
        tool={selectedTool}
        open={isToolDetailOpen}
        onOpenChange={setIsToolDetailOpen}
      />

      {/* Edit Tool Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать инструмент</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditTool)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название инструмента *</FormLabel>
                    <FormControl>
                      <Input placeholder="Например: Дрель Bosch" {...field} data-testid="input-edit-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="inventoryNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Инвентарный номер</FormLabel>
                    <FormControl>
                      <Input placeholder="Например: DR-001" {...field} data-testid="input-edit-inventory" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Стоимость, AED</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        className="h-12 text-[18px] font-bold"
                        style={{ fontFamily: 'var(--corp-mono)', color: 'var(--corp-accent)' }}
                        {...field}
                        data-testid="input-edit-cost"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Дополнительная информация..." {...field} data-testid="input-edit-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingTool(null);
                    form.reset();
                  }}
                  className="flex-1 h-10 text-[13px] font-semibold transition-colors"
                  style={{ background: 'var(--corp-surface-2)', color: 'var(--corp-ink-2)', borderRadius: 'var(--corp-r)' }}
                  data-testid="button-cancel-edit"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={editToolMutation.isPending}
                  className="flex-1 h-10 text-[13px] font-semibold transition-colors disabled:opacity-50"
                  style={{ background: 'var(--corp-accent)', color: '#fff', borderRadius: 'var(--corp-r)' }}
                  data-testid="button-save-edit"
                >
                  {editToolMutation.isPending ? "Сохранение..." : "Сохранить"}
                </button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Tool Movement Dialog */}
      <Dialog open={isMovementModalOpen} onOpenChange={setIsMovementModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {movementTool?.status === 'AVAILABLE' ? 'Выдать инструмент' : 'Вернуть инструмент'}
            </DialogTitle>
          </DialogHeader>
          <Form {...movementForm}>
            <form onSubmit={movementForm.handleSubmit(handleMovementSubmit)} className="space-y-4">
              <div
                className="p-3 text-[13px]"
                style={{
                  background: 'var(--corp-surface-2)',
                  borderRadius: 'var(--corp-r)',
                  color: 'var(--corp-ink)',
                }}
              >
                <strong>{movementTool?.name}</strong>
                {movementTool?.inventoryNumber && (
                  <span style={{ color: 'var(--corp-muted)', fontFamily: 'var(--corp-mono)' }}>
                    {' '}(№ {movementTool.inventoryNumber})
                  </span>
                )}
              </div>

              <FormField
                control={movementForm.control}
                name="personName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Имя получателя/возвращающего *</FormLabel>
                    <FormControl>
                      <Input placeholder="Введите имя" {...field} data-testid="input-person-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={movementForm.control}
                name="personPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Телефон *</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+971 XX XXX XXXX" {...field} data-testid="input-person-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={movementForm.control}
                name="eventTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дата и время</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} data-testid="input-event-time" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <Label>Фото *</Label>
                <div className="flex gap-2 mt-1.5">
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="cursor-pointer"
                      data-testid="input-photo"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.capture = 'environment';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) setSelectedFile(file);
                      };
                      input.click();
                    }}
                    className="inline-flex items-center gap-1 h-9 px-3 text-[12px] font-semibold transition-colors whitespace-nowrap"
                    style={{ background: 'var(--corp-surface-2)', color: 'var(--corp-ink-2)', borderRadius: 'var(--corp-r)' }}
                    data-testid="button-camera"
                  >
                    <Camera className="h-4 w-4" />
                    Сфото
                  </button>
                </div>
                {selectedFile && (
                  <p className="text-[11px] mt-1" style={{ color: 'var(--corp-pos)' }}>
                    Выбран файл: {selectedFile.name}
                  </p>
                )}
                <p className="text-[11px] mt-1" style={{ color: 'var(--corp-muted)' }}>
                  Сделайте фото инструмента и человека
                </p>
              </div>

              <FormField
                control={movementForm.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Комментарий</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Дополнительные заметки..." {...field} data-testid="input-comment" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsMovementModalOpen(false);
                    setMovementTool(null);
                    setSelectedFile(null);
                    movementForm.reset();
                  }}
                  className="flex-1 h-10 text-[13px] font-semibold transition-colors"
                  style={{ background: 'var(--corp-surface-2)', color: 'var(--corp-ink-2)', borderRadius: 'var(--corp-r)' }}
                  data-testid="button-cancel-movement"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={createMovementMutation.isPending || !selectedFile}
                  className="flex-1 h-10 text-[13px] font-semibold transition-colors disabled:opacity-50"
                  style={{ background: 'var(--corp-accent)', color: '#fff', borderRadius: 'var(--corp-r)' }}
                  data-testid="button-save-movement"
                >
                  {createMovementMutation.isPending ? "Сохранение..." : "Сохранить"}
                </button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ToolDetailDialogProps {
  tool: ToolWithPerson | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ToolDetailDialog({ tool, open, onOpenChange }: ToolDetailDialogProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const { data: movements = [] } = useQuery<ToolMovement[]>({
    queryKey: ['/api/tools', tool?.id, 'movements'],
    enabled: !!tool?.id,
  });

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedPhoto) {
        setSelectedPhoto(null);
      }
    };

    if (selectedPhoto) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [selectedPhoto]);

  if (!tool) return null;

  return (
    <Dialog open={open} onOpenChange={selectedPhoto ? () => {} : onOpenChange}>
      <DialogContent
        className={`max-w-2xl max-h-[80vh] overflow-auto ${selectedPhoto ? 'pointer-events-none' : ''}`}
        style={selectedPhoto ? { pointerEvents: 'none' } : {}}
      >
        <DialogHeader>
          <DialogTitle>{tool.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h4 className="text-[10px] font-bold uppercase mb-2" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>
                Основная информация
              </h4>
              <div className="space-y-2 text-[13px]">
                <div>
                  <span style={{ color: 'var(--corp-muted)' }}>Инвентарный номер:</span>
                  <span className="ml-2" style={{ color: 'var(--corp-ink)', fontFamily: 'var(--corp-mono)' }}>
                    {tool.inventoryNumber || '—'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ color: 'var(--corp-muted)' }}>Стоимость:</span>
                  <MoneyAED amount={parseFloat(tool.cost) || 0} size={13} weight={600} tone="ink" />
                </div>
                <div>
                  <span style={{ color: 'var(--corp-muted)' }}>Описание:</span>
                  <span className="ml-2" style={{ color: 'var(--corp-ink)' }}>
                    {tool.description || '—'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-bold uppercase mb-2" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>
                Текущий статус
              </h4>
              <div className="space-y-2">
                <StatusPill status={tool.status} />
                {tool.currentPerson && (
                  <div className="text-[13px] mt-2">
                    <div style={{ color: 'var(--corp-ink)' }}>{tool.currentPerson.name}</div>
                    <div style={{ color: 'var(--corp-muted)', fontFamily: 'var(--corp-mono)' }}>
                      {tool.currentPerson.phone}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Movement History */}
          <div>
            <h4 className="text-[10px] font-bold uppercase mb-3" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>
              История движений
            </h4>
            {movements.length === 0 ? (
              <p className="text-[12px]" style={{ color: 'var(--corp-muted)' }}>История движений пуста</p>
            ) : (
              <div className="space-y-2">
                {movements.map((movement) => (
                  <div key={movement.id} className="p-3" style={SECTION_STYLE}>
                    <div className="flex gap-3 items-start">
                      <div className="flex-shrink-0">
                        {movement.photoUrl ? (
                          <div className="relative group">
                            <img
                              src={movement.photoUrl}
                              alt="Фото движения"
                              className="w-16 h-16 object-cover cursor-pointer transition-all hover:scale-105"
                              style={{
                                borderRadius: 'var(--corp-r)',
                                border: '2px solid var(--corp-line)',
                              }}
                              onClick={() => setSelectedPhoto(movement.photoUrl)}
                              data-testid={`img-thumbnail-${movement.id}`}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          </div>
                        ) : (
                          <div
                            className="w-16 h-16 flex items-center justify-center text-[10px]"
                            style={{
                              background: 'var(--corp-surface-2)',
                              borderRadius: 'var(--corp-r)',
                              color: 'var(--corp-ink-3)',
                            }}
                          >
                            <div className="text-center">
                              <div>📷</div>
                              <div>Нет фото</div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <div
                              className="text-[12px] font-bold uppercase"
                              style={{
                                color: movement.type === 'ISSUE' ? 'var(--corp-warn, #f59e0b)' : 'var(--corp-pos)',
                                letterSpacing: '0.04em',
                              }}
                            >
                              {movement.type === 'ISSUE' ? 'Выдано' : 'Возвращено'}
                            </div>
                            <div className="text-[12px] mt-0.5" style={{ color: 'var(--corp-ink)' }}>
                              {movement.personName}
                              <span style={{ color: 'var(--corp-muted)', fontFamily: 'var(--corp-mono)' }}>
                                {' '}({movement.personPhone})
                              </span>
                            </div>
                            {movement.comment && (
                              <div className="text-[11px] mt-1" style={{ color: 'var(--corp-ink-3)' }}>
                                {movement.comment}
                              </div>
                            )}
                          </div>
                          <div
                            className="text-[11px] flex-shrink-0"
                            style={{ color: 'var(--corp-muted)', fontFamily: 'var(--corp-mono)' }}
                          >
                            {fmtDateRu(movement.eventTime as any)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Photo Viewer Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in-0 duration-200"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setSelectedPhoto(null);
          }}
          data-testid="photo-modal-overlay"
          style={{ zIndex: 9999, pointerEvents: 'auto' }}
        >
          <div className="relative max-w-[95vw] max-h-[95vh] p-4 animate-in zoom-in-95 duration-200">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedPhoto(null);
              }}
              className="absolute -top-2 -right-2 z-[10000] w-10 h-10 flex items-center justify-center bg-white hover:bg-gray-100 rounded-full text-gray-800 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-110"
              data-testid="button-close-photo"
              title="Закрыть (ESC)"
              style={{ pointerEvents: 'auto' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div
              className="relative bg-white rounded-lg p-2 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedPhoto}
                alt="Полное фото"
                className="max-w-full max-h-[85vh] object-contain rounded-md"
                onClick={(e) => e.stopPropagation()}
                data-testid="img-full-photo"
              />
            </div>

            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm z-[10001]">
              Нажмите за пределы изображения или ESC для закрытия
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
