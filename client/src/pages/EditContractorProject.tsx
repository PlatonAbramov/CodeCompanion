import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Building2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const editContractorProjectSchema = z.object({
  budgetAllocation: z.number().min(0, "Бюджет не может быть отрицательным"),
  workDescription: z.string().min(1, "Описание работ обязательно"),
  startDate: z.string().min(1, "Дата начала обязательна"),
  endDate: z.string().optional(),
  isActive: z.boolean(),
});

type EditContractorProjectFormData = z.infer<typeof editContractorProjectSchema>;

interface ContractorProject {
  id: string;
  contractorId: string;
  projectId: string;
  projectName: string;
  budgetAllocation: number;
  workDescription: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
}

interface Contractor {
  id: string;
  name: string;
  company?: string;
  specialization: string;
}

export default function EditContractorProject() {
  const params = useParams();
  const contractorId = params.contractorId;
  const projectAssignmentId = params.assignmentId;
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get contractor project assignment
  const { data: assignment, isLoading } = useQuery<ContractorProject>({
    queryKey: ['/api/contractor-projects', projectAssignmentId],
    enabled: !!(projectAssignmentId && (user?.role === 'admin' || user?.role === 'director')),
  });

  // Get contractor info
  const { data: contractor } = useQuery<Contractor>({
    queryKey: ['/api/contractors', contractorId],
    enabled: !!(contractorId && (user?.role === 'admin' || user?.role === 'director')),
  });

  const form = useForm<EditContractorProjectFormData>({
    resolver: zodResolver(editContractorProjectSchema),
    defaultValues: {
      budgetAllocation: 0,
      workDescription: "",
      startDate: "",
      endDate: "",
      isActive: true,
    },
  });

  // Update form when assignment data loads
  useEffect(() => {
    if (assignment) {
      const startDate = new Date(assignment.startDate).toISOString().split('T')[0];
      const endDate = assignment.endDate ? new Date(assignment.endDate).toISOString().split('T')[0] : "";
      
      form.reset({
        budgetAllocation: assignment.budgetAllocation,
        workDescription: assignment.workDescription,
        startDate,
        endDate,
        isActive: assignment.isActive,
      });
    }
  }, [assignment, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: EditContractorProjectFormData) => {
      const res = await apiRequest(`/api/contractor-projects/${projectAssignmentId}`, {
        method: 'PUT',
        body: JSON.stringify({
          budget: data.budgetAllocation.toString(),
          description: data.workDescription,
          startDate: new Date(data.startDate).toISOString(),
          endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
          status: data.isActive ? 'active' : 'completed',
        })
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Назначение обновлено",
        description: "Данные по проекту подрядчика успешно обновлены",
      });
      // Invalidate related caches
      queryClient.invalidateQueries({ queryKey: ['/api/contractors', contractorId, 'projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contractors', contractorId, 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contractor-projects', projectAssignmentId] });
      // Go back to contractor detail
      setLocation(`/contractor/${contractorId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditContractorProjectFormData) => {
    updateMutation.mutate(data);
  };

  const goBack = () => {
    setLocation(`/contractor/${contractorId}`);
  };

  // Authorization check
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p>Загрузка...</p>
      </div>
    );
  }

  if (user.role !== 'admin' && user.role !== 'director') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p>Доступ запрещен</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-500">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!assignment || !contractor) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Назначение не найдено</h2>
          <p className="text-slate-500 mb-4">Возможно, назначение было удалено</p>
          <Button onClick={goBack}>Вернуться</Button>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('ru-RU')} AED`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
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
            <div>
              <h2 className="font-semibold text-slate-900">
                Редактировать назначение
              </h2>
              <p className="text-sm text-slate-500">
                {contractor.company || contractor.name} → {assignment.projectName}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 size={20} />
              Параметры назначения
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="budgetAllocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Бюджет подрядчика на проект *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="workDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Описание работ *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Описание выполняемых работ"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Дата начала *</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Дата окончания</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Статус</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === 'true')}
                        value={field.value ? 'true' : 'false'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="true">Активен</SelectItem>
                          <SelectItem value="false">Завершен</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="flex-1"
                  >
                    {updateMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        Сохранение...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Save size={16} />
                        Сохранить
                      </div>
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={goBack}>
                    Отмена
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}