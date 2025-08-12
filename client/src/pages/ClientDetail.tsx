import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Plus, Edit2, Trash2, Building2, Phone, Mail, MapPin, CreditCard, FileText, Calendar, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientProjectSchema, insertClientPaymentSchema, type InsertClientProject, type InsertClientPayment } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

export default function ClientDetailPage() {
  const [, params] = useRoute("/clients/:id");
  const clientId = params?.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ["/api/clients", clientId],
    enabled: !!clientId,
  });

  const { data: clientStats, isLoading: statsLoading } = useQuery({
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

  // Safe access to data with defaults
  const safeClient = client as any;
  const safeStats = clientStats as any || {
    totalProjects: 0,
    totalPayments: 0,
    remainingAmount: 0
  };
  const safeClientProjects = clientProjects as any[] || [];
  const safeClientPayments = clientPayments as any[] || [];
  const safeAllProjects = allProjects as any[] || [];
  
  console.log("Available projects for assignment:", safeAllProjects);

  const projectForm = useForm<InsertClientProject>({
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

  const assignProjectMutation = useMutation({
    mutationFn: async (data: InsertClientProject) => {
      console.log("Making API request to:", `/api/clients/${clientId}/projects`);
      console.log("Request data:", data);
      const response = await fetch(`/api/clients/${clientId}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      console.log("Response status:", response.status);
      if (!response.ok) {
        const error = await response.text();
        console.error("Response error:", error);
        throw new Error(`Failed to assign project: ${error}`);
      }
      return response.json();
    },
    onSuccess: () => {
      console.log("Project assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "stats"] });
      setIsProjectDialogOpen(false);
      projectForm.reset();
      toast({ title: "Проект назначен успешно" });
    },
    onError: (error) => {
      console.error("Assignment failed:", error);
      toast({
        title: "Ошибка",
        description: `Не удалось назначить проект: ${error.message}`,
        variant: "destructive",
      });
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
      toast({
        title: "Ошибка",
        description: "Не удалось добавить платеж",
        variant: "destructive",
      });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const response = await fetch(`/api/client-payments/${paymentId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete payment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "stats"] });
      toast({ title: "Платеж удален успешно" });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить платеж",
        variant: "destructive",
      });
    },
  });

  const removeProjectMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const response = await fetch(`/api/client-projects/${assignmentId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to remove project");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "stats"] });
      toast({ title: "Проект отвязан успешно" });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось отвязать проект",
        variant: "destructive",
      });
    },
  });

  const onProjectSubmit = (data: InsertClientProject) => {
    console.log("Submitting project assignment:", data);
    console.log("Client ID:", clientId);
    assignProjectMutation.mutate({
      ...data,
      clientId: clientId!,
    });
  };

  const onPaymentSubmit = (data: InsertClientPayment) => {
    createPaymentMutation.mutate({
      ...data,
      clientId: clientId!,
    });
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
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const stats = clientStats || { totalPayments: 0, totalProjects: 0, remainingAmount: 0 };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/clients">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад к заказчикам
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building2 className="w-8 h-8" />
              {safeClient?.name}
            </h1>
            {safeClient?.company && (
              <p className="text-lg text-muted-foreground">{safeClient.company}</p>
            )}
          </div>
        </div>
        <Badge variant={safeClient?.isActive ? "default" : "secondary"}>
          {safeClient?.isActive ? "Активный" : "Неактивный"}
        </Badge>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего проектов</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeStats.totalProjects}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Общая сумма платежей</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(safeStats.totalPayments)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Остаток к доплате</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${safeStats.remainingAmount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {formatCurrency(safeStats.remainingAmount)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client Information */}
      <Card>
        <CardHeader>
          <CardTitle>Информация о заказчике</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {safeClient?.contactPerson && (
              <div>
                <strong>Контактное лицо:</strong> {safeClient.contactPerson}
              </div>
            )}
            {safeClient?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <strong>Телефон:</strong> {safeClient.phone}
              </div>
            )}
            {safeClient?.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <strong>Email:</strong> {safeClient.email}
              </div>
            )}
            {safeClient?.address && (
              <div className="flex items-start gap-2 md:col-span-2">
                <MapPin className="w-4 h-4 mt-1" />
                <div>
                  <strong>Адрес:</strong> {safeClient.address}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList>
          <TabsTrigger value="projects">Проекты</TabsTrigger>
          <TabsTrigger value="payments">Платежи</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Проекты заказчика</h3>
            <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Назначить проект
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Назначить проект заказчику</DialogTitle>
                </DialogHeader>
                <Form {...projectForm}>
                  <form onSubmit={projectForm.handleSubmit(onProjectSubmit, (errors) => {
                    console.log("Form validation errors:", errors);
                  })} className="space-y-4">
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
                                <div className="p-2 text-sm text-muted-foreground">Нет доступных проектов</div>
                              ) : (
                                safeAllProjects.map((project: any) => (
                                  <SelectItem key={project.id} value={project.id}>
                                    {project.name}
                                  </SelectItem>
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
                            <FormLabel>Сумма договора (д.إ)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
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
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsProjectDialogOpen(false)}>
                        Отмена
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={assignProjectMutation.isPending}
                        onClick={() => {
                          console.log("Assign button clicked");
                          console.log("Form values:", projectForm.getValues());
                          console.log("Form state:", projectForm.formState);
                        }}
                      >
                        {assignProjectMutation.isPending ? "Назначение..." : "Назначить"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {safeClientProjects.map((project: any) => (
              <Card key={project.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <h4 className="font-semibold">{project.projectName}</h4>
                      {project.contractAmount && (
                        <p className="text-sm">
                          <strong>Сумма договора:</strong> {formatCurrency(project.contractAmount)}
                        </p>
                      )}
                      {project.contractNumber && (
                        <p className="text-sm">
                          <strong>Номер договора:</strong> {project.contractNumber}
                        </p>
                      )}
                      {project.contractDate && (
                        <p className="text-sm">
                          <strong>Дата договора:</strong> {new Date(project.contractDate).toLocaleDateString('ru-RU')}
                        </p>
                      )}
                      {project.description && (
                        <p className="text-sm text-muted-foreground">{project.description}</p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                        {project.status === 'active' ? 'Активный' : 'Завершен'}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveProject(project.id, project.projectName)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!safeClientProjects || safeClientProjects.length === 0) && (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Проекты не назначены</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Платежи заказчика</h3>
            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить платеж
                </Button>
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
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите проект" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {safeClientProjects.map((project: any) => (
                                <SelectItem key={project.projectId} value={project.projectId}>
                                  {project.projectName}
                                </SelectItem>
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
                            <FormLabel>Сумма платежа (د.إ) *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
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
                                type="date"
                                {...field}
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
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                        Отмена
                      </Button>
                      <Button type="submit" disabled={createPaymentMutation.isPending}>
                        Добавить
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {safeClientPayments.map((payment: any) => (
              <Card key={payment.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        <span className="font-semibold">{formatCurrency(payment.amount)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Проект: {payment.projectName}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {new Date(payment.paymentDate).toLocaleDateString('ru-RU')}
                      </div>
                      {payment.paymentMethod && (
                        <p className="text-sm">
                          <strong>Способ:</strong> {payment.paymentMethod}
                        </p>
                      )}
                      {payment.description && (
                        <p className="text-sm text-muted-foreground">{payment.description}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePayment(payment.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!safeClientPayments || safeClientPayments.length === 0) && (
              <div className="text-center py-8">
                <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Платежи не найдены</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}