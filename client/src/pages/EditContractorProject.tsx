import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { CorpHeader, CorpEmpty } from "@/components/corp-ui";
import { useLanguage } from "@/components/LanguageProvider";

const editContractorProjectSchema = z.object({
  budgetAllocation: z.number().min(0),
  workDescription: z.string().min(1),
  startDate: z.string().min(1),
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

const SECTION_STYLE: React.CSSProperties = {
  background: 'var(--corp-surface)',
  border: '1px solid var(--corp-line)',
  borderRadius: 'var(--corp-r-lg)',
};

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label
      className="block text-[10px] font-bold uppercase mb-1.5"
      style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}
    >
      {children}
      {required && <span style={{ color: 'var(--corp-neg)' }}> *</span>}
    </label>
  );
}

export default function EditContractorProject() {
  const params = useParams();
  const contractorId = params.contractorId;
  const projectAssignmentId = params.assignmentId;
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const { data: assignment, isLoading } = useQuery<ContractorProject>({
    queryKey: ['/api/contractor-projects', projectAssignmentId],
    enabled: !!(projectAssignmentId && (user?.role === 'admin' || user?.role === 'director')),
  });

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
        }),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t('assignmentUpdated'), description: t('assignmentUpdatedDescription') });
      queryClient.invalidateQueries({ queryKey: ['/api/contractors', contractorId, 'projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contractors', contractorId, 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contractor-projects', projectAssignmentId] });
      setLocation(`/contractor/${contractorId}`);
    },
    onError: (error: Error) => {
      toast({ title: t('error'), description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: EditContractorProjectFormData) => updateMutation.mutate(data);
  const goBack = () => setLocation(`/contractor/${contractorId}`);

  if (!user) {
    return <div className="min-h-screen" style={{ background: 'var(--corp-bg)' }} />;
  }

  if (user.role !== 'admin' && user.role !== 'director') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--corp-bg)' }}>
        <p style={{ color: 'var(--corp-ink-2)' }}>{t('accessDenied')}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--corp-bg)' }}>
        <CorpHeader title={t('editAssignmentTitle')} onBack={goBack} />
      </div>
    );
  }

  if (!assignment || !contractor) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--corp-bg)' }}>
        <CorpHeader title={t('editAssignmentTitle')} onBack={goBack} />
        <div className="p-4">
          <CorpEmpty
            icon={<Building2 size={28} />}
            title={t('assignmentNotFound')}
            description={t('assignmentMaybeDeleted')}
            actionLabel={t('goBackLabel')}
            onAction={goBack}
          />
        </div>
      </div>
    );
  }

  const subtitle = `${contractor.company || contractor.name} → ${assignment.projectName}`;

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--corp-bg)' }}>
      <CorpHeader title={t('editAssignmentTitle')} subtitle={subtitle} onBack={goBack} />

      <div className="p-4 max-w-2xl mx-auto">
        <div className="p-4" style={SECTION_STYLE}>
          <h3 className="text-[10px] font-bold uppercase mb-4 flex items-center gap-1.5" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>
            <Building2 size={12} /> {t('assignmentParameters')}
          </h3>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="budgetAllocation"
                render={({ field }) => (
                  <FormItem>
                    <FieldLabel required>{t('contractorBudgetLabel')}</FieldLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        className="h-12 text-[18px] font-bold"
                        style={{
                          fontFamily: 'var(--corp-mono)',
                          color: 'var(--corp-accent)',
                        }}
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-budget"
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
                    <FieldLabel required>{t('workDescriptionLabel')}</FieldLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('workDescriptionPlaceholder')}
                        rows={3}
                        {...field}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FieldLabel required>{t('startDateLabel')}</FieldLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-start-date" />
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
                      <FieldLabel>{t('endDateLabel')}</FieldLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} data-testid="input-end-date" />
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
                    <FieldLabel>{t('statusLabel')}</FieldLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === 'true')}
                      value={field.value ? 'true' : 'false'}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="true">{t('activeStatus')}</SelectItem>
                        <SelectItem value="false">{t('completedStatus')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={goBack}
                  className="flex-1 h-11 text-[13px] font-semibold transition-colors"
                  style={{
                    background: 'var(--corp-surface-2)',
                    color: 'var(--corp-ink-2)',
                    borderRadius: 'var(--corp-r)',
                  }}
                  data-testid="button-cancel"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex-1 h-11 text-[13px] font-semibold transition-colors disabled:opacity-50"
                  style={{
                    background: 'var(--corp-accent)',
                    color: '#fff',
                    borderRadius: 'var(--corp-r)',
                  }}
                  data-testid="button-save"
                >
                  {updateMutation.isPending ? t('saving') : t('save')}
                </button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
