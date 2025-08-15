import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertToolSchema, insertToolMovementSchema, type Tool, type ToolMovement } from "@shared/schema";
import { z } from "zod";
import { Plus, Search, Camera, User, Package, ArrowUpDown, Eye, MoreVertical, Edit, Trash2, ArrowLeft } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BottomNavigation } from "@/components/BottomNavigation";

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
  photoUrl: true 
}).extend({
  type: z.enum(['ISSUE', 'RETURN']),
  eventTime: z.string().optional(),
  comment: z.string().optional(),
});

export default function Tools() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
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
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Form for creating/editing tools
  const form = useForm<z.infer<typeof createToolFormSchema>>({
    resolver: zodResolver(createToolFormSchema),
    defaultValues: {
      name: "",
      inventoryNumber: undefined,
      cost: 0,
      description: undefined,
    },
  });

  // Form for tool movements
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

  // Get all tools
  const { data: tools = [], isLoading } = useQuery<ToolWithPerson[]>({
    queryKey: ['/api/tools'],
  });

  // Create tool mutation
  const createToolMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createToolFormSchema>) => {
      const res = await apiRequest('POST', '/api/tools', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tools'] });
      setIsCreateModalOpen(false);
      form.reset();
      toast({ title: "Инструмент создан" });
    },
    onError: (error) => {
      toast({ title: "Ошибка создания инструмента", variant: "destructive" });
    },
  });

  // Create tool movement mutation
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
      
      if (!res.ok) {
        throw new Error(`Ошибка: ${res.status}`);
      }
      
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
      toast({ 
        title: "Ошибка записи движения", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Edit tool mutation
  const editToolMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createToolFormSchema>) => {
      if (!editingTool) return;
      const res = await apiRequest('PATCH', `/api/tools/${editingTool.id}`, data);
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

  // Delete tool mutation
  const deleteToolMutation = useMutation({
    mutationFn: async (toolId: string) => {
      const res = await apiRequest('DELETE', `/api/tools/${toolId}`, {});
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

  // Filter tools based on search and status
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

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount || '0');
    return `${num.toLocaleString('ru-RU')} д.إ.`;
  };

  const getStatusBadgeVariant = (status: string | null): "default" | "secondary" | "destructive" => {
    switch (status) {
      case 'AVAILABLE': return 'default';
      case 'OUT': return 'secondary';
      case 'WRITTEN_OFF': return 'destructive';
      default: return 'default';
    }
  };

  const getStatusText = (status: string | null) => {
    switch (status) {
      case 'AVAILABLE': return 'В наличии';
      case 'OUT': return 'У человека';
      case 'WRITTEN_OFF': return 'Списан';
      default: return status || 'Неизвестно';
    }
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

  return (
    <div className="container mx-auto py-6 px-4 pb-20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setLocation('/director')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Инструменты</h1>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Добавить инструмент
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
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
                        <Input placeholder="Например: Дрель Bosch" {...field} />
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
                        <Input placeholder="Например: DR-001" {...field} />
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
                      <FormLabel>Стоимость (AED)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0" {...field} />
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
                        <Textarea placeholder="Дополнительная информация..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={createToolMutation.isPending}>
                    {createToolMutation.isPending ? "Создание..." : "Создать"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                    Отмена
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию, имени или телефону..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Tabs value={filterStatus} onValueChange={(value) => setFilterStatus(value as FilterStatus)} className="w-auto">
          <TabsList>
            <TabsTrigger value="all">Все</TabsTrigger>
            <TabsTrigger value="available">В наличии</TabsTrigger>
            <TabsTrigger value="out">В работе</TabsTrigger>
            <TabsTrigger value="written_off">Списанные</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tools Grid */}
      {isLoading ? (
        <div className="text-center py-8">Загрузка...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTools.map((tool) => (
            <Card key={tool.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{tool.name}</CardTitle>
                    {tool.inventoryNumber && (
                      <p className="text-sm text-muted-foreground">№ {tool.inventoryNumber}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(tool.status)}>
                      {getStatusText(tool.status)}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditModal(tool)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(tool.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{formatCurrency((parseFloat(tool.cost) || 0).toString())}</span>
                  </div>
                  
                  {tool.status === 'OUT' && tool.currentPerson && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {tool.currentPerson.name} ({tool.currentPerson.phone})
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openToolDetail(tool)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Детали
                    </Button>
                    <Button
                      size="sm"
                      variant={tool.status === 'AVAILABLE' ? 'default' : 'secondary'}
                      className="flex-1"
                      onClick={() => openMovementModal(tool)}
                    >
                      <ArrowUpDown className="h-4 w-4 mr-1" />
                      {tool.status === 'AVAILABLE' ? 'Выдать' : 'Вернуть'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredTools.length === 0 && !isLoading && (
        <div className="text-center py-8 text-muted-foreground">
          {searchQuery || filterStatus !== 'all' 
            ? 'Инструменты не найдены' 
            : 'Нет инструментов'
          }
        </div>
      )}

      {/* Tool Detail Dialog */}
      <ToolDetailDialog 
        tool={selectedTool}
        open={isToolDetailOpen}
        onOpenChange={setIsToolDetailOpen}
      />

      {/* Edit Tool Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
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
                      <Input placeholder="Например: Дрель Bosch" {...field} />
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
                      <Input placeholder="Например: DR-001" {...field} />
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
                    <FormLabel>Стоимость (AED)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0" {...field} />
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
                      <Textarea placeholder="Дополнительная информация..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={editToolMutation.isPending}>
                  {editToolMutation.isPending ? "Сохранение..." : "Сохранить"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingTool(null);
                    form.reset();
                  }}
                >
                  Отмена
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Tool Movement Dialog */}
      <Dialog open={isMovementModalOpen} onOpenChange={setIsMovementModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {movementTool?.status === 'AVAILABLE' ? 'Выдать инструмент' : 'Вернуть инструмент'}
            </DialogTitle>
          </DialogHeader>
          <Form {...movementForm}>
            <form onSubmit={movementForm.handleSubmit(handleMovementSubmit)} className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <strong>{movementTool?.name}</strong>
                {movementTool?.inventoryNumber && ` (№ ${movementTool.inventoryNumber})`}
              </div>

              <FormField
                control={movementForm.control}
                name="personName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Имя получателя/возвращающего *</FormLabel>
                    <FormControl>
                      <Input placeholder="Введите имя" {...field} />
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
                      <Input type="tel" placeholder="+971 XX XXX XXXX" {...field} />
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
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <Label htmlFor="photo">Фото *</Label>
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
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
                      <Textarea placeholder="Дополнительные заметки..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  disabled={createMovementMutation.isPending || !selectedFile}
                >
                  {createMovementMutation.isPending ? "Сохранение..." : "Сохранить"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsMovementModalOpen(false);
                    setMovementTool(null);
                    setSelectedFile(null);
                    movementForm.reset();
                  }}
                >
                  Отмена
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <BottomNavigation currentPage="tools" />
    </div>
  );
}

// Tool Detail Dialog Component
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

  // Handle Escape key to close photo modal
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

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount || '0') : amount;
    return `${num.toLocaleString('ru-RU')} AED`;
  };

  const formatDateTime = (date: string | Date) => {
    return new Date(date).toLocaleString('ru-RU');
  };

  return (
    <Dialog open={open} onOpenChange={selectedPhoto ? () => {} : onOpenChange}>
      <DialogContent 
        className={`max-w-2xl max-h-[80vh] overflow-auto ${selectedPhoto ? 'pointer-events-none' : ''}`}
        style={selectedPhoto ? { pointerEvents: 'none' } : {}}
      >
        <DialogHeader>
          <DialogTitle>{tool.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Основная информация</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Инвентарный номер:</span>
                  <span className="ml-2">{tool.inventoryNumber || 'Не указан'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Стоимость:</span>
                  <span className="ml-2">{formatCurrency(tool.cost)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Описание:</span>
                  <span className="ml-2">{tool.description || 'Не указано'}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Текущий статус</h4>
              <div className="space-y-2">
                <Badge variant={tool.status === 'AVAILABLE' ? 'default' : 'secondary'}>
                  {tool.status === 'AVAILABLE' ? 'В наличии' : 
                   tool.status === 'OUT' ? 'У человека' : 'Списан'}
                </Badge>
                {tool.currentPerson && (
                  <div className="text-sm">
                    <div>{tool.currentPerson.name}</div>
                    <div className="text-muted-foreground">{tool.currentPerson.phone}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Movement History */}
          <div>
            <h4 className="font-semibold mb-3">История движений</h4>
            {movements.length === 0 ? (
              <p className="text-muted-foreground">История движений пуста</p>
            ) : (
              <div className="space-y-2">
                {movements.map((movement) => (
                  <Card key={movement.id} className="p-3">
                    <div className="flex gap-3 items-start">
                      {/* Mini photo */}
                      <div className="flex-shrink-0">
                        {movement.photoUrl ? (
                          <div className="relative group">
                            <img
                              src={movement.photoUrl}
                              alt="Фото движения"
                              className="w-16 h-16 object-cover rounded-lg cursor-pointer transition-all duration-200 border-2 border-gray-200 hover:border-blue-400 hover:scale-105 hover:shadow-lg"
                              onClick={() => setSelectedPhoto(movement.photoUrl)}
                              data-testid={`img-thumbnail-${movement.id}`}
                              onError={(e) => {
                                console.error('Ошибка загрузки изображения:', movement.photoUrl);
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = `<div class="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center text-xs text-red-600 cursor-pointer hover:bg-red-200 transition-colors border-2 border-red-300" data-testid="img-error-${movement.id}">❌<br/>Ошибка</div>`;
                                }
                              }}
                            />
                            {/* Hover overlay with magnifying glass icon */}
                            <div 
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPhoto(movement.photoUrl);
                              }}
                              data-testid={`button-enlarge-photo-${movement.id}`}
                            >
                              <svg 
                                className="w-6 h-6 text-white drop-shadow-lg" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <circle cx="11" cy="11" r="8" strokeWidth={2}/>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35"/>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 8v6m-3-3h6"/>
                              </svg>
                            </div>
                          </div>
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-500 border-2 border-gray-300">
                            <div className="text-center">
                              <div>📷</div>
                              <div>Нет фото</div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Movement details */}
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">
                              {movement.type === 'ISSUE' ? 'Выдано' : 'Возвращено'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {movement.personName} ({movement.personPhone})
                            </div>
                            {movement.comment && (
                              <div className="text-sm mt-1">{movement.comment}</div>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDateTime(movement.eventTime)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
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
            {/* Close button */}
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
            
            {/* Image container */}
            <div 
              className="relative bg-white rounded-lg p-2 shadow-2xl"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on image container
            >
              <img
                src={selectedPhoto}
                alt="Полное фото движения инструмента"
                className="max-w-full max-h-[85vh] object-contain rounded-md"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on image
                data-testid="img-full-photo"
              />
            </div>
            
            {/* Instructions */}
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm z-[10001]">
              Нажмите за пределы изображения или ESC для закрытия
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}