import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ExternalLink } from "lucide-react";
import { CorpHeader } from "@/components/corp-ui";
import { fmtNumber } from "@/lib/locale";

const SECTION_STYLE: React.CSSProperties = {
  background: 'var(--corp-surface)',
  border: '1px solid var(--corp-line)',
  borderRadius: 'var(--corp-r-lg)',
};

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Label
      className="block text-[10px] font-bold uppercase mb-1.5"
      style={{ color: 'var(--corp-muted)', letterSpacing: '0.06em' }}
    >
      {children}
      {required && <span style={{ color: 'var(--corp-neg)', marginLeft: 2 }}>*</span>}
    </Label>
  );
}

export default function EditExpense() {
  const [location, setLocation] = useLocation();
  useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const pathParts = location.split('/');
  const expenseId = pathParts[pathParts.length - 1];
  const projectId = pathParts[pathParts.length - 2];

  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    description: '',
    receiptUrl: '',
    contractorId: '',
  });

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['/api/projects', projectId, 'expenses'],
    enabled: !!projectId,
  });

  const { data: contractors } = useQuery({
    queryKey: ['/api/contractors'],
    enabled: !!projectId,
  });

  useEffect(() => {
    if (expenses && expenseId) {
      const expense = (expenses as any[]).find((e: any) => e.id === expenseId);
      if (expense) {
        setFormData({
          amount: expense.amount,
          category: expense.category || '',
          description: expense.description || '',
          receiptUrl: expense.receiptUrl || '',
          contractorId: expense.contractorId || '',
        });
      }
    }
  }, [expenses, expenseId]);

  const { mutate: updateExpense, isPending } = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update expense');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: t('expenseUpdated'), description: t('changesSaved') });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'expenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'financial-summary'] });
      goBack();
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error.message || t('expenseUpdateFailed'),
        variant: "destructive",
      });
    },
  });

  const goBack = () => setLocation(`/expenses/${projectId}`);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.category || !formData.description) {
      toast({ title: t('error'), description: t('fillRequiredFields'), variant: "destructive" });
      return;
    }
    if (formData.category === 'contractor_payments' && !formData.contractorId) {
      toast({ title: t('error'), description: t('contractorRequiredForCategory'), variant: "destructive" });
      return;
    }
    const updateData: any = {
      amount: parseFloat(formData.amount),
      category: formData.category,
      description: formData.description,
      receiptUrl: formData.receiptUrl,
    };
    if (formData.category === 'contractor_payments' && formData.contractorId) {
      updateData.contractorId = formData.contractorId;
    }
    updateExpense(updateData);
  };

  const formatNum = (s: string) => s ? fmtNumber(parseFloat(s || "0"), language) : '';

  const categories = [
    { value: 'materials', label: t('materials') },
    { value: 'tools', label: t('tools') },
    { value: 'transport', label: t('transport') },
    { value: 'services', label: t('services') },
    { value: 'salary_employees', label: t('salaryEmployeesLong') },
    { value: 'salary_daily', label: t('salaryDaily') },
    { value: 'contractor_payments', label: t('contractorPayments') },
    { value: 'other', label: t('other') },
  ];

  if (isLoading) {
    return <div style={{ background: 'var(--corp-bg)' }} className="min-h-screen p-4" />;
  }

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'var(--corp-bg)', fontFamily: 'var(--corp-font)', color: 'var(--corp-ink)' }}
    >
      <CorpHeader title={t('editExpenseTitle')} subtitle={t('editExpenseSubtitle')} onBack={goBack} />

      <main className="px-4 pt-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="p-4" style={SECTION_STYLE}>
            <FieldLabel required>{t('amount')}</FieldLabel>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0"
                value={formData.amount}
                onChange={(e) => setFormData(p => ({ ...p, amount: e.target.value }))}
                required
                className="pr-14 h-12 text-[20px] font-bold"
                style={{ fontFamily: 'var(--corp-mono)', color: 'var(--corp-neg)' }}
                data-testid="input-amount"
              />
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold uppercase"
                style={{ color: 'var(--corp-muted)', letterSpacing: '0.06em' }}
              >
                AED
              </span>
            </div>
            {formData.amount && (
              <p className="text-[11px] mt-1" style={{ color: 'var(--corp-muted)', fontFamily: 'var(--corp-mono)' }}>
                {formatNum(formData.amount)}{'\u00A0'}AED
              </p>
            )}
          </div>

          <div className="p-4" style={SECTION_STYLE}>
            <FieldLabel required>{t('category')}</FieldLabel>
            <Select
              value={formData.category}
              onValueChange={(v) => setFormData(p => ({ ...p, category: v }))}
            >
              <SelectTrigger className="h-10 text-[13px]" data-testid="select-category">
                <SelectValue placeholder={t('selectCategory')} />
              </SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.category === 'contractor_payments' && (
            <div className="p-4" style={SECTION_STYLE}>
              <FieldLabel required>{t('contractor')}</FieldLabel>
              <Select
                value={formData.contractorId}
                onValueChange={(v) => setFormData(p => ({ ...p, contractorId: v }))}
              >
                <SelectTrigger className="h-10 text-[13px]" data-testid="select-contractor">
                  <SelectValue placeholder={t('selectContractor')} />
                </SelectTrigger>
                <SelectContent>
                  {(contractors as any[])?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company ? `${c.company} (${c.name})` : c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] mt-1.5" style={{ color: 'var(--corp-muted)' }}>
                {t('changeContractorHint')}
              </p>
            </div>
          )}

          <div className="p-4" style={SECTION_STYLE}>
            <FieldLabel required>{t('description')}</FieldLabel>
            <Textarea
              id="description"
              placeholder={t('expenseDescriptionShort')}
              value={formData.description}
              onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
              rows={3}
              required
              className="text-[13px] resize-none"
              data-testid="input-description"
            />
          </div>

          {formData.receiptUrl && (
            <div className="p-4" style={SECTION_STYLE}>
              <FieldLabel>{t('currentReceipt')}</FieldLabel>
              <button
                type="button"
                onClick={() => window.open(formData.receiptUrl, '_blank')}
                className="inline-flex items-center gap-2 h-10 px-4 text-[13px] font-semibold transition-colors"
                style={{
                  background: 'var(--corp-surface-2)',
                  border: '1px solid var(--corp-line)',
                  color: 'var(--corp-ink)',
                  borderRadius: 'var(--corp-r)',
                }}
                data-testid="button-view-receipt"
              >
                <ExternalLink size={14} />
                {t('viewReceipt')}
              </button>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={goBack}
              className="flex-1 h-12 text-[14px] font-semibold transition-colors"
              style={{
                background: 'var(--corp-surface)',
                border: '1px solid var(--corp-line)',
                color: 'var(--corp-ink-2)',
                borderRadius: 'var(--corp-r)',
              }}
              data-testid="button-cancel"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 h-12 text-[14px] font-semibold transition-colors disabled:opacity-50"
              style={{ background: 'var(--corp-ink)', color: '#fff', borderRadius: 'var(--corp-r)' }}
              data-testid="button-save"
            >
              {isPending ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
