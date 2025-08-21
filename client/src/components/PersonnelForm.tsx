import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const personnelSchema = z.object({
  firstName: z.string().min(1, "Имя обязательно"),
  lastName: z.string().min(1, "Фамилия обязательна"),
  middleName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Неверный формат email").optional().or(z.literal("")),
  emiratesId: z.string().optional(),
  emiratesIdIssueDate: z.string().optional(),
  emiratesIdExpiryDate: z.string().optional(),
  specialization: z.string().min(1, "Специализация обязательна"),
  startDate: z.string().min(1, "Дата начала работы обязательна"),
  salary: z.union([
    z.number(),
    z.string().transform((val) => parseFloat(val || "0"))
  ]).optional(),
  status: z.enum(["active", "dismissed", "vacation"]).default("active"),
  photoUrl: z.string().optional(),
});

type PersonnelFormData = z.infer<typeof personnelSchema>;

interface PersonnelFormProps {
  person?: any;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PersonnelForm({ person, open, onClose, onSuccess }: PersonnelFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const form = useForm<PersonnelFormData>({
    resolver: zodResolver(personnelSchema),
    defaultValues: person ? {
      firstName: person.firstName,
      lastName: person.lastName,
      middleName: person.middleName || "",
      dateOfBirth: person.dateOfBirth ? person.dateOfBirth.split('T')[0] : "",
      phone: person.phone || "",
      email: person.email || "",
      emiratesId: person.emiratesId || "",
      emiratesIdIssueDate: person.emiratesIdIssueDate ? person.emiratesIdIssueDate.split('T')[0] : "",
      emiratesIdExpiryDate: person.emiratesIdExpiryDate ? person.emiratesIdExpiryDate.split('T')[0] : "",
      specialization: person.specialization,
      startDate: person.startDate.split('T')[0],
      salary: person.salary ? parseFloat(person.salary) : undefined,
      status: person.status || "active",
      photoUrl: person.photoUrl || "",
    } : {
      firstName: "",
      lastName: "",
      middleName: "",
      phone: "",
      email: "",
      emiratesId: "",
      specialization: "",
      startDate: new Date().toISOString().split('T')[0],
      status: "active",
    }
  });
  
  const createMutation = useMutation({
    mutationFn: async (data: PersonnelFormData) => {
      return await apiRequest("/api/personnel", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Сотрудник добавлен",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: async (data: PersonnelFormData) => {
      return await apiRequest(`/api/personnel/${person.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Данные сотрудника обновлены",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: PersonnelFormData) => {
    if (person) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };
  
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {person ? "Редактировать сотрудника" : "Добавить сотрудника"}
          </SheetTitle>
        </SheetHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="font-medium">Личные данные</h3>
              
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Фамилия *</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!isAdmin} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Имя *</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!isAdmin} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="middleName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Отчество</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!isAdmin} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дата рождения</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={!isAdmin} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Телефон</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!isAdmin} />
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
                      <Input type="email" {...field} disabled={!isAdmin} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Emirates ID */}
            <div className="space-y-4">
              <h3 className="font-medium">Emirates ID</h3>
              
              <FormField
                control={form.control}
                name="emiratesId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Номер Emirates ID</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!isAdmin} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="emiratesIdIssueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Дата выдачи</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} disabled={!isAdmin} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="emiratesIdExpiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Дата окончания</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} disabled={!isAdmin} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Work Information */}
            <div className="space-y-4">
              <h3 className="font-medium">Рабочая информация</h3>
              
              <FormField
                control={form.control}
                name="specialization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Специализация *</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!isAdmin} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дата начала работы *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={!isAdmin} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="salary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Зарплата (AED)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        disabled={!isAdmin}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Статус</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                      disabled={!isAdmin}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Активен</SelectItem>
                        <SelectItem value="dismissed">Уволен</SelectItem>
                        <SelectItem value="vacation">Отпуск</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Actions */}
            {isAdmin && (
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onClose}>
                  Отмена
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending 
                    ? "Сохранение..." 
                    : person ? "Сохранить" : "Добавить"}
                </Button>
              </div>
            )}
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}