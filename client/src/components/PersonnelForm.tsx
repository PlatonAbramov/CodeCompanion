import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

const personnelSchema = z.object({
  firstName: z.string().min(1, "Имя обязательно"),
  lastName: z.string().min(1, "Фамилия обязательна"),
  middleName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  phoneNumber: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  emiratesId: z.string().optional(),
  emiratesIdIssueDate: z.string().optional(),
  emiratesIdExpiryDate: z.string().optional(),
  position: z.string().min(1, "Должность обязательна"),
  hireDate: z.string().min(1, "Дата приема обязательна"),
  salary: z.coerce.number().optional(),
  status: z.enum(["active", "inactive", "vacation", "terminated"]),
  passportNumber: z.string().optional(),
  nationality: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  visa: z.string().optional(),
  contractInfo: z.string().optional(),
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
  const queryClient = useQueryClient();
  
  const form = useForm<PersonnelFormData>({
    resolver: zodResolver(personnelSchema),
    defaultValues: {
      firstName: person?.firstName || "",
      lastName: person?.lastName || "",
      middleName: person?.middleName || "",
      dateOfBirth: person?.dateOfBirth || "",
      phoneNumber: person?.phoneNumber || "",
      email: person?.email || "",
      emiratesId: person?.emiratesId || "",
      emiratesIdIssueDate: person?.emiratesIdIssueDate || "",
      emiratesIdExpiryDate: person?.emiratesIdExpiryDate || "",
      position: person?.position || "",
      hireDate: person?.hireDate || "",
      salary: person?.salary || undefined,
      status: person?.status || "active",
      passportNumber: person?.passportNumber || "",
      nationality: person?.nationality || "",
      address: person?.address || "",
      emergencyContact: person?.emergencyContact || "",
      visa: person?.visa || "",
      contractInfo: person?.contractInfo || "",
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
      queryClient.invalidateQueries({ queryKey: ["/api/personnel"] });
      toast({
        title: "Успешно",
        description: "Сотрудник добавлен",
      });
      onSuccess();
      form.reset();
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
      queryClient.invalidateQueries({ queryKey: ["/api/personnel"] });
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
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {person ? "Редактировать сотрудника" : "Добавить сотрудника"}
          </SheetTitle>
        </SheetHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Личная информация</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Фамилия *</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="middleName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Отчество</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Телефон</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+971 50 123 4567" />
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
                        <Input {...field} type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="nationality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Гражданство</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Адрес проживания</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="emergencyContact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Экстренный контакт</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Имя и телефон" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Documents */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Документы</h3>
              
              <FormField
                control={form.control}
                name="passportNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Номер паспорта</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="emiratesId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emirates ID</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="784-1990-1234567-1" />
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
                      <FormLabel>Дата выдачи Emirates ID</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
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
                      <FormLabel>Дата истечения Emirates ID</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="visa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Информация о визе</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Тип визы, срок действия" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Employment */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Трудоустройство</h3>
              
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Должность *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите должность" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Электрик">Электрик</SelectItem>
                        <SelectItem value="Сантехник">Сантехник</SelectItem>
                        <SelectItem value="Плотник">Плотник</SelectItem>
                        <SelectItem value="Маляр">Маляр</SelectItem>
                        <SelectItem value="Разнорабочий">Разнорабочий</SelectItem>
                        <SelectItem value="Мастер">Мастер</SelectItem>
                        <SelectItem value="Прораб">Прораб</SelectItem>
                        <SelectItem value="Менеджер">Менеджер</SelectItem>
                        <SelectItem value="Водитель">Водитель</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="hireDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Дата приема *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
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
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Статус</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Активный</SelectItem>
                        <SelectItem value="inactive">Неактивный</SelectItem>
                        <SelectItem value="vacation">В отпуске</SelectItem>
                        <SelectItem value="terminated">Уволен</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="contractInfo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Информация о контракте</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Тип контракта, условия" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Сохранение..."
                  : person
                  ? "Сохранить изменения"
                  : "Добавить сотрудника"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Отмена
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}