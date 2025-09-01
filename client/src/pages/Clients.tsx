import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Building2, Phone, Mail, MapPin, Eye, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Link, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { useAuth } from "@/hooks/useAuth";

export default function ClientsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState("active");

  const goBack = () => {
    setLocation('/director');
  };

  // Different behavior for client role users
  const isClientUser = user?.role === 'client';

  // For client users, get their assigned projects
  const { 
    data: clientProjects, 
    isLoading: isLoadingProjects, 
    error: projectsError 
  } = useQuery({
    queryKey: ["/api/my-client-projects"],
    enabled: isClientUser,
  });

  // Debug logging for client users
  if (isClientUser) {
    console.log('Client user data:', { clientProjects, isLoadingProjects, projectsError, user });
    console.log('isClientUser:', isClientUser);
  }

  // For admin/director users, get all clients
  const { data: clients, isLoading } = useQuery({
    queryKey: ["/api/clients"],
    enabled: !isClientUser,
  });

  // Get deleted clients
  const { data: deletedClients, isLoading: isLoadingDeleted } = useQuery({
    queryKey: ["/api/clients/deleted"],
    enabled: !isClientUser && activeTab === "deleted",
  });

  // Get all users with role 'client' for selection
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
      toast({
        title: "Ошибка",
        description: "Не удалось создать заказчика",
        variant: "destructive",
      });
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
      toast({
        title: "Ошибка",
        description: "Не удалось обновить заказчика",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/clients/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete client");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients/deleted"] });
      toast({ title: "Заказчик перемещен в удаленные" });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить заказчика",
        variant: "destructive",
      });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/clients/${id}/restore`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to restore client");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients/deleted"] });
      toast({ title: "Заказчик восстановлен успешно" });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось восстановить заказчика",
        variant: "destructive",
      });
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

  // Client role specific - render projects view
  if (isClientUser) {
    console.log('Rendering client view', { isLoadingProjects, clientProjects, projectsError });
    
    if (isLoadingProjects) {
      return (
        <div className="min-h-screen bg-slate-50 p-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center h-64">
              <div className="text-lg">Загрузка проектов...</div>
            </div>
          </div>
        </div>
      );
    }

    if (projectsError) {
      console.error('Projects error:', projectsError);
      return (
        <div className="min-h-screen bg-slate-50 p-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center h-64">
              <div className="text-lg text-red-600">Ошибка загрузки проектов</div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 pb-20">
        {/* Header for client users */}
        <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
          <div className="px-4 py-3 flex justify-between items-center">
            <h1 className="text-xl font-semibold text-slate-900">Мои проекты</h1>
            <Button 
              variant="outline" 
              size="sm"
              onClick={async () => {
                await apiRequest('/api/auth/logout', { method: 'POST' });
                setLocation('/login');
              }}
            >
              Выйти
            </Button>
          </div>
        </header>

        <div className="container mx-auto p-6 space-y-6">
          {/* Projects list for client users */}
          {Array.isArray(clientProjects) && clientProjects.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {clientProjects.map((project: any) => (
                <Card 
                  key={project.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer hover:bg-slate-50"
                  onClick={() => setLocation(`/projects/${project.projectId}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Building2 className="w-5 h-5" />
                          {project.projectName}
                        </CardTitle>
                        {project.location && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {project.location}
                          </p>
                        )}
                      </div>
                      <Badge variant={project.status === 'active' ? "default" : "secondary"}>
                        {project.status === 'active' ? "Активный" : "Завершен"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <span className="font-medium">Стоимость:</span>
                      <span className="ml-2">{Number(project.totalCost).toLocaleString()} AED</span>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <span className="font-medium">Оплачено:</span>
                      <span className="ml-2">{Number(project.totalPaid).toLocaleString()} AED</span>
                    </div>
                    {project.contractNumber && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <span className="font-medium">Договор:</span>
                        <span className="ml-2">{project.contractNumber}</span>
                      </div>
                    )}
                    {project.description && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Описание:</span>
                        <p className="mt-1">{project.description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Проектов не найдено</h3>
              <p className="text-muted-foreground">
                На вас еще не назначен ни одного проекта
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Admin/Director role - original functionality
  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header with back button */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={goBack}
              className="mr-2"
            >
              <ArrowLeft size={20} />
            </Button>
            <h1 className="text-xl font-semibold text-slate-900">Заказчики</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          {(user?.role === 'admin' || user?.role === 'director') && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingClient(null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить заказчика
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingClient ? "Редактировать заказчика" : "Добавить заказчика"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Название *</FormLabel>
                        <FormControl>
                          <Input placeholder="Название заказчика" {...field} />
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
                          <Input placeholder="Название компании" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Телефон</FormLabel>
                        <FormControl>
                          <Input placeholder="+971 XX XXX XXXX" {...field} value={field.value || ""} />
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
                          <Input type="email" placeholder="email@example.com" {...field} value={field.value || ""} />
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
                        <Textarea placeholder="Адрес заказчика" {...field} value={field.value || ""} />
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
                        <Input placeholder="Имя контактного лица" {...field} value={field.value || ""} />
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
                      <Select onValueChange={(value) => field.onChange(value === "none" ? undefined : value)} value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите пользователя с правами заказчика" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Не назначен</SelectItem>
                          {clientUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name} ({user.username})
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
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Активный</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Заказчик активен и может быть назначен на проекты
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={handleDialogClose}>
                    Отмена
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingClient ? "Обновить" : "Создать"}
                  </Button>
                </div>
              </form>
            </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">Активные заказчики</TabsTrigger>
            <TabsTrigger value="deleted">Удаленные заказчики</TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {(clients as Client[] || []).map((client: Client) => (
            <Card 
              key={client.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer hover:bg-slate-50"
              onClick={() => setLocation(`/clients/${client.id}`)}
            >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    {client.name}
                  </CardTitle>
                  {client.company && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {client.company}
                    </p>
                  )}
                </div>
                <Badge variant={client.isActive ? "default" : "secondary"}>
                  {client.isActive ? "Активный" : "Неактивный"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {client.contactPerson && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <span className="font-medium">Контакт:</span>
                  <span className="ml-2">{client.contactPerson}</span>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Phone className="w-4 h-4 mr-2" />
                  {client.phone}
                </div>
              )}
              {client.email && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Mail className="w-4 h-4 mr-2" />
                  {client.email}
                </div>
              )}
              {client.address && (
                <div className="flex items-start text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{client.address}</span>
                </div>
              )}
              {client.userId && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <span className="font-medium">Пользователь:</span>
                  <span className="ml-2">
                    {clientUsers.find(u => u.id === client.userId)?.name || 'Не найден'}
                  </span>
                </div>
              )}
              {(user?.role === 'admin' || user?.role === 'director') && (
                <div className="flex justify-end space-x-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(client);
                    }}
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Редактировать
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(client);
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Удалить
                  </Button>
                </div>
              )}
              </CardContent>
            </Card>
              ))}
            </div>

            {Array.isArray(clients) && clients.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Заказчики не найдены</h3>
            <p className="text-muted-foreground mb-6">
              Добавьте первого заказчика для начала работы
            </p>
            {(user?.role === 'admin' || user?.role === 'director') && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Добавить заказчика
              </Button>
            )}
          </div>
            )}
          </TabsContent>

          <TabsContent value="deleted" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {(deletedClients as Client[] || []).map((client: Client) => (
                <Card 
                  key={client.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer hover:bg-slate-50 opacity-70"
                  onClick={() => setLocation(`/clients/${client.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Building2 className="w-5 h-5" />
                          {client.name}
                        </CardTitle>
                        {client.company && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {client.company}
                          </p>
                        )}
                      </div>
                      <Badge variant="destructive">Удален</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {client.contactPerson && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <span className="font-medium">Контакт:</span>
                        <span className="ml-2">{client.contactPerson}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Phone className="w-4 h-4 mr-2" />
                        {client.phone}
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Mail className="w-4 h-4 mr-2" />
                        {client.email}
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-start text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                        <span>{client.address}</span>
                      </div>
                    )}
                    <div className="flex justify-end space-x-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestore(client);
                        }}
                        className="text-green-600 hover:text-green-700"
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Восстановить
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {Array.isArray(deletedClients) && deletedClients.length === 0 && (
              <div className="text-center py-12">
                <Building2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Удаленных заказчиков нет</h3>
                <p className="text-muted-foreground">
                  Все удаленные заказчики будут отображаться здесь
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>


    </div>
  );
}