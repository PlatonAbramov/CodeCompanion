import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileUploader } from "@/components/FileUploader";
import { QuickAddContractor } from "@/components/QuickAddContractor";
import { useToast } from "@/hooks/use-toast";
import { Camera, Check, FileText } from "lucide-react";
import { CorpHeader } from "@/components/corp-ui";
import { fmtNumber } from "@/lib/locale";

interface Project { id: string; name: string }
interface Contractor { id: string; name: string; company?: string; specialization: string }

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

export default function AddExpense() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  if (user && user.role !== 'admin' && user.role !== 'director' && user.role !== 'master') {
    setLocation('/master');
    return null;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const projectIdFromUrl = urlParams.get('projectId');

  const [formData, setFormData] = useState({
    projectId: projectIdFromUrl || '',
    amount: '',
    category: '',
    description: '',
    receiptUrl: '',
    contractorId: '',
  });
  const [selectedReceipt, setSelectedReceipt] = useState<{
    fileName: string; fileUrl: string; fileSize: number; mimeType: string;
  } | null>(null);

  const { data: projects = [] } = useQuery<Project[]>({ queryKey: ['/api/projects'] });
  const { data: contractors = [] } = useQuery<Contractor[]>({
    queryKey: ['/api/contractors'],
    enabled: formData.category === 'contractor_payments',
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('/api/expenses', { method: 'POST', body: JSON.stringify(data) });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/financial-overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      if (formData.projectId) {
        queryClient.invalidateQueries({ queryKey: ['/api/projects', formData.projectId, 'expenses'] });
        queryClient.invalidateQueries({ queryKey: ['/api/projects', formData.projectId, 'financial-summary'] });
      }
      toast({ title: t('success'), description: t('expenseAdded') });
      goBack();
    },
    onError: () => {
      toast({ title: t('error'), description: t('expenseAddFailed'), variant: "destructive" });
    },
  });

  const goBack = () => {
    if (projectIdFromUrl) setLocation(`/projects/${projectIdFromUrl}`);
    else if (formData.projectId) setLocation(`/projects/${formData.projectId}`);
    else if (user?.role === 'admin' || user?.role === 'director') setLocation('/director');
    else setLocation('/master');
  };

  const handleReceiptUpload = (files: Array<{
    fileName: string; fileUrl: string; fileSize: number; mimeType: string;
  }>) => {
    if (files.length > 0) {
      const file = files[0];
      setFormData(prev => ({ ...prev, receiptUrl: file.fileUrl }));
      setSelectedReceipt(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.category === 'contractor_payments' && !formData.contractorId) {
      toast({ title: t('error'), description: t('selectContractorRequired'), variant: "destructive" });
      return;
    }
    const dataToSubmit = {
      ...formData,
      contractorId: formData.category === 'contractor_payments' ? formData.contractorId : undefined,
    };
    createExpenseMutation.mutate(dataToSubmit);
  };

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

  const formatNum = (s: string) => {
    if (!s) return '';
    const n = parseFloat(s || "0");
    return fmtNumber(n, language);
  };

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'var(--corp-bg)', fontFamily: 'var(--corp-font)', color: 'var(--corp-ink)' }}
    >
      <CorpHeader title={t('newExpenseTitle')} subtitle={t('expenseSubtitle')} onBack={goBack} />

      <main className="px-4 pt-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Project */}
          <div className="p-4" style={SECTION_STYLE}>
            <FieldLabel>{t('project')}</FieldLabel>
            <Select
              value={formData.projectId}
              onValueChange={(v) => setFormData(p => ({ ...p, projectId: v }))}
            >
              <SelectTrigger className="h-10 text-[13px]" data-testid="select-project">
                <SelectValue placeholder={t('selectProject')} />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="p-4" style={SECTION_STYLE}>
            <FieldLabel required>{t('amount')}</FieldLabel>
            <div className="relative">
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(p => ({ ...p, amount: e.target.value }))}
                placeholder="0"
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

          {/* Category */}
          <div className="p-4" style={SECTION_STYLE}>
            <FieldLabel required>{t('category')}</FieldLabel>
            <Select
              value={formData.category}
              onValueChange={(v) => setFormData(p => ({
                ...p,
                category: v,
                contractorId: v === 'contractor_payments' ? p.contractorId : '',
              }))}
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

          {/* Contractor (conditional) */}
          {formData.category === 'contractor_payments' && (
            <div className="p-4" style={SECTION_STYLE}>
              <div className="flex items-center justify-between mb-1.5">
                <FieldLabel required>{t('contractor')}</FieldLabel>
                <QuickAddContractor
                  onContractorAdded={(id) => setFormData(p => ({ ...p, contractorId: id }))}
                />
              </div>
              <Select
                value={formData.contractorId}
                onValueChange={(v) => setFormData(p => ({ ...p, contractorId: v }))}
              >
                <SelectTrigger className="h-10 text-[13px]" data-testid="select-contractor">
                  <SelectValue placeholder={t('selectContractor')} />
                </SelectTrigger>
                <SelectContent>
                  {contractors.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Description */}
          <div className="p-4" style={SECTION_STYLE}>
            <FieldLabel>{t('description')}</FieldLabel>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
              placeholder={t('expenseDescriptionPlaceholder')}
              className="resize-none text-[13px]"
              rows={3}
              data-testid="input-description"
            />
          </div>

          {/* Receipt */}
          <div className="p-4" style={SECTION_STYLE}>
            <FieldLabel>{t('receiptOptional')}</FieldLabel>
            <div
              className="rounded-lg p-5 text-center"
              style={{
                border: '2px dashed var(--corp-line)',
                background: 'var(--corp-surface-2)',
              }}
            >
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-2"
                style={{ background: 'var(--corp-surface)', color: 'var(--corp-ink-3)' }}
              >
                <Camera size={20} />
              </div>
              <p className="text-[12px] mb-3" style={{ color: 'var(--corp-ink-3)' }}>
                {t('takePhotoOrChoose')}
              </p>
              <FileUploader
                onUpload={handleReceiptUpload}
                maxFiles={1}
                maxFileSize={10485760}
                accept="image/*,.pdf"
              >
                <div className="inline-flex items-center gap-1.5 text-[12px] font-semibold">
                  <Camera size={13} />
                  <span>{t('attachFile')}</span>
                </div>
              </FileUploader>

              {selectedReceipt && (
                <div
                  className="mt-3 p-2 flex items-center justify-center gap-2"
                  style={{
                    background: 'var(--corp-pos-soft)',
                    border: '1px solid rgba(34, 197, 94, 0.25)',
                    borderRadius: 'var(--corp-r)',
                  }}
                >
                  <Check size={13} style={{ color: 'var(--corp-pos)' }} />
                  <span
                    className="text-[12px] font-semibold truncate"
                    style={{ color: 'var(--corp-pos)' }}
                  >
                    {selectedReceipt.fileName}
                  </span>
                  <FileText size={12} style={{ color: 'var(--corp-pos)' }} />
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={createExpenseMutation.isPending}
              className="w-full h-12 text-[14px] font-semibold transition-colors disabled:opacity-50"
              style={{ background: 'var(--corp-ink)', color: '#fff', borderRadius: 'var(--corp-r)' }}
              data-testid="button-submit-expense"
            >
              {createExpenseMutation.isPending ? t('loading') : t('addExpense')}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
