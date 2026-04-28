import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { CorpHeader } from "@/components/corp-ui";
import { fmtNumber } from "@/lib/locale";

interface Project {
  id: string; name: string; location?: string; totalCost: string;
  status: string; startDate?: string; endDate?: string; createdAt: string;
}

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

export default function AddCustomerAdvance() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  if (user && user.role !== 'admin' && user.role !== 'director') {
    setLocation('/master');
    return null;
  }

  const projectId = location.split('/')[2];

  const [formData, setFormData] = useState({
    projectId: projectId || '',
    amount: '',
    description: '',
    date: '',
  });

  const { data: projects = [] } = useQuery<Project[]>({ queryKey: ['/api/projects'] });
  const { data: project } = useQuery<Project>({ queryKey: ['/api/projects', projectId] });

  const createCustomerAdvanceMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('/api/customer-advances', { method: 'POST', body: JSON.stringify(data) });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer-advances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/financial-overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      if (formData.projectId) {
        queryClient.invalidateQueries({ queryKey: ['/api/projects', formData.projectId, 'customer-advances'] });
        queryClient.invalidateQueries({ queryKey: ['/api/projects', formData.projectId, 'financial-summary'] });
      }
      toast({ title: t('success'), description: t('customerAdvanceAdded') });
      goBack();
    },
    onError: () => {
      toast({ title: t('error'), description: t('customerAdvanceAddFailed'), variant: "destructive" });
    },
  });

  const goBack = () => {
    if (projectId) setLocation(`/projects/${projectId}`);
    else if (user?.role === 'admin' || user?.role === 'director') setLocation('/director');
    else setLocation('/master');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.date) {
      toast({ title: t('error'), description: t('amountAndDateRequired'), variant: "destructive" });
      return;
    }
    createCustomerAdvanceMutation.mutate(formData);
  };

  const formatNum = (s: string) => s ? fmtNumber(parseFloat(s || "0"), language) : '';

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'var(--corp-bg)', fontFamily: 'var(--corp-font)', color: 'var(--corp-ink)' }}
    >
      <CorpHeader
        title={t('customerAdvanceTitle')}
        subtitle={project?.name || t('customerAdvanceSubtitle')}
        onBack={goBack}
      />

      <main className="px-4 pt-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          {!projectId && (
            <div className="p-4" style={SECTION_STYLE}>
              <FieldLabel required>{t('project')}</FieldLabel>
              <Select
                value={formData.projectId}
                onValueChange={(v) => setFormData(p => ({ ...p, projectId: v }))}
              >
                <SelectTrigger className="h-10 text-[13px]" data-testid="select-project">
                  <SelectValue placeholder={t('selectProject')} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(pr => (
                    <SelectItem key={pr.id} value={pr.id}>{pr.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Amount */}
          <div className="p-4" style={SECTION_STYLE}>
            <FieldLabel required>{t('customerAdvanceAmountLabel')}</FieldLabel>
            <div className="relative">
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(p => ({ ...p, amount: e.target.value }))}
                placeholder="0"
                required
                className="pr-14 h-12 text-[20px] font-bold"
                style={{ fontFamily: 'var(--corp-mono)', color: 'var(--corp-pos)' }}
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

          {/* Date */}
          <div className="p-4" style={SECTION_STYLE}>
            <FieldLabel required>{t('customerAdvanceDateLabel')}</FieldLabel>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(p => ({ ...p, date: e.target.value }))}
              required
              className="h-10 text-[13px]"
              style={{ fontFamily: 'var(--corp-mono)' }}
              data-testid="input-date"
            />
          </div>

          {/* Description */}
          <div className="p-4" style={SECTION_STYLE}>
            <FieldLabel>{t('description')}</FieldLabel>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
              placeholder={t('customerAdvanceDescriptionPlaceholder')}
              rows={3}
              className="text-[13px] resize-none"
              data-testid="input-description"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={createCustomerAdvanceMutation.isPending}
              className="w-full h-12 text-[14px] font-semibold transition-colors disabled:opacity-50"
              style={{ background: 'var(--corp-pos)', color: '#fff', borderRadius: 'var(--corp-r)' }}
              data-testid="button-submit-customer-advance"
            >
              {createCustomerAdvanceMutation.isPending ? t('addingProgressShort') : t('addCustomerAdvanceButton')}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
