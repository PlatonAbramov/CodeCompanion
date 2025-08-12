import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertContractorProjectSchema, type InsertContractorProject } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { QuickAddContractor } from "./QuickAddContractor";

interface AssignContractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractorId?: string;
}

interface Project {
  id: string;
  name: string;
  location?: string;
}

interface Contractor {
  id: string;
  name: string;
  company?: string;
  specialization: string;
}

export function AssignContractorModal({ isOpen, onClose, contractorId }: AssignContractorModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedContractorId, setSelectedContractorId] = useState(contractorId || "");

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: isOpen,
  });

  const { data: contractors } = useQuery<Contractor[]>({
    queryKey: ["/api/contractors"],
    enabled: isOpen && !contractorId,
  });

  const form = useForm<InsertContractorProject>({
    resolver: zodResolver(insertContractorProjectSchema),
    defaultValues: {
      projectId: "",
      contractorId: contractorId || "",
      budget: 0,
      description: "",
      startDate: new Date(),
      endDate: undefined,
      status: "active",
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (data: InsertContractorProject) => {
      const response = await fetch(`/api/contractors/${data.contractorId}/assign-project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: data.projectId,
          budget: data.budget,
          description: data.description,
          startDate: data.startDate,
          endDate: data.endDate,
          status: data.status,
        }),
      });
      if (!response.ok) throw new Error("Failed to assign contractor to project");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      if (contractorId) {
        queryClient.invalidateQueries({ queryKey: ["/api/contractors", contractorId, "projects"] });
        queryClient.invalidateQueries({ queryKey: ["/api/contractors", contractorId, "stats"] });
      }
      if (selectedContractorId) {
        queryClient.invalidateQueries({ queryKey: ["/api/contractors", selectedContractorId, "projects"] });
        queryClient.invalidateQueries({ queryKey: ["/api/contractors", selectedContractorId, "stats"] });
      }
      onClose();
      form.reset();
      toast({
        title: "Подрядчик назначен",
        description: "Подрядчик успешно назначен на проект",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось назначить подрядчика на проект",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertContractorProject) => {
    const finalContractorId = contractorId || selectedContractorId;
    if (!finalContractorId) {
      toast({
        title: "Ошибка",
        description: "Выберите подрядчика",
        variant: "destructive",
      });
      return;
    }

    assignMutation.mutate({
      ...data,
      contractorId: finalContractorId,
    });
  };

  const handleContractorAdded = (newContractorId: string) => {
    setSelectedContractorId(newContractorId);
    form.setValue("contractorId", newContractorId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Назначить подрядчика на проект</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!contractorId && (
              <FormField
                control={form.control}
                name="contractorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Подрядчик *</FormLabel>
                    <div className="flex gap-2">
                      <FormControl className="flex-1">
                        <Select onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedContractorId(value);
                        }} value={selectedContractorId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите подрядчика" />
                          </SelectTrigger>
                          <SelectContent>
                            {contractors?.map((contractor) => (
                              <SelectItem key={contractor.id} value={contractor.id}>
                                {contractor.name} - {contractor.specialization}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <QuickAddContractor onContractorAdded={handleContractorAdded} />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Проект *</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите проект" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects?.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name} {project.location && `(${project.location})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Бюджет подрядчика (د.إ) *</FormLabel>
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
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дата начала *</FormLabel>
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
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Дата окончания</FormLabel>
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
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Описание работ *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Опишите объем работ и обязанности подрядчика"
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
                disabled={assignMutation.isPending}
              >
                {assignMutation.isPending ? "Назначаем..." : "Назначить"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}