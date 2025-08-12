import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientProjectSchema, type InsertClientProject, insertClientSchema, type InsertClient } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

interface AssignClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

interface Client {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
}

export function AssignClientModal({ isOpen, onClose, projectId }: AssignClientModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  
  console.log("AssignClientModal props - projectId:", projectId);

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: isOpen,
  });

  const form = useForm<InsertClientProject>({
    resolver: zodResolver(insertClientProjectSchema),
    mode: "onChange",
    defaultValues: {
      projectId: projectId || "",
      clientId: "",
      contractAmount: undefined,
      contractNumber: "",
      contractDate: undefined,
      description: "",
      status: "active",
    },
  });

  const clientForm = useForm<InsertClient>({
    resolver: zodResolver(insertClientSchema),
    defaultValues: {
      name: "",
      company: "",
      phone: "",
      email: "",
      address: "",
      contactPerson: "",
      isActive: true,
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (data: InsertClientProject) => {
      const response = await fetch(`/api/clients/${data.clientId}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: data.projectId,
          contractAmount: data.contractAmount,
          contractNumber: data.contractNumber,
          contractDate: data.contractDate,
          description: data.description,
          status: data.status,
        }),
      });
      if (!response.ok) throw new Error("Failed to assign client to project");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      onClose();
      form.reset();
      toast({
        title: "Заказчик назначен",
        description: "Заказчик успешно назначен на проект",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось назначить заказчика на проект",
        variant: "destructive",
      });
    },
  });

  // Обновляем projectId в форме при изменении пропа
  useEffect(() => {
    if (projectId && isOpen) {
      form.setValue('projectId', projectId);
      console.log("Setting projectId in form:", projectId);
    }
  }, [projectId, isOpen, form]);

  const createClientMutation = useMutation({
    mutationFn: async (data: InsertClient) => {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create client");
      return response.json();
    },
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      form.setValue("clientId", newClient.id);
      setIsCreatingClient(false);
      clientForm.reset();
      toast({
        title: "Заказчик создан",
        description: "Новый заказчик успешно создан",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать заказчика",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertClientProject) => {
    console.log("Submitting assignment data:", data);
    // Убедимся, что projectId установлен
    const submitData = {
      ...data,
      projectId: projectId || data.projectId
    };
    console.log("Final submit data:", submitData);
    assignMutation.mutate(submitData);
  };

  const onCreateClient = (data: InsertClient) => {
    createClientMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isCreatingClient ? "Добавить нового заказчика" : "Назначить заказчика на проект"}
          </DialogTitle>
        </DialogHeader>
        
        {isCreatingClient ? (
          <Form {...clientForm}>
            <form onSubmit={clientForm.handleSubmit(onCreateClient)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={clientForm.control}
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
                  control={clientForm.control}
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
                  control={clientForm.control}
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
                  control={clientForm.control}
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
                control={clientForm.control}
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
                control={clientForm.control}
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

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreatingClient(false)}
                  className="flex-1"
                  disabled={createClientMutation.isPending}
                >
                  Назад
                </Button>
                <Button 
                  type="submit"
                  className="flex-1"
                  disabled={createClientMutation.isPending}
                >
                  {createClientMutation.isPending ? "Создаем..." : "Создать заказчика"}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Заказчик *</FormLabel>
                    <div className="flex gap-2">
                      <FormControl className="flex-1">
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите заказчика" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients?.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name} {client.company && `(${client.company})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setIsCreatingClient(true)}
                      >
                        <Plus size={16} />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contractAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Сумма договора (د.إ) *</FormLabel>
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
                  control={form.control}
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
                control={form.control}
                name="contractDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дата договора *</FormLabel>
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

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание работ</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Описание работ по договору"
                        rows={3}
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={assignMutation.isPending}
                >
                  Отмена
                </Button>
                <Button 
                  type="submit"
                  className="flex-1"
                  disabled={assignMutation.isPending || !form.watch('clientId')}
                  onClick={() => {
                    console.log("AssignClientModal button clicked");
                    console.log("Form values:", form.getValues());
                    console.log("Client ID:", form.watch('clientId'));
                    console.log("Form errors:", form.formState.errors);
                  }}
                >
                  {assignMutation.isPending ? "Назначаем..." : "Назначить"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}