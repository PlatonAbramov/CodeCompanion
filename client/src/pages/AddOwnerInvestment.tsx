import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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

export default function AddOwnerInvestment() {
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
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const preSelectedInvestor = urlParams.get('investor');

  const [formData, setFormData] = useState({
    amount: '',
    investor: preSelectedInvestor || '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const createOwnerInvestmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest(`/api/projects/${projectId}/owner-investments`, {
        method: 'POST', body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'owner-investments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'financial-summary'] });
      toast({ title: t('success'), description: t('investmentAdded') });
      setLocation(`/owner-investments/${projectId}`);
    },
    onError: () => {
      toast({ title: t('error'), description: t('investmentAddFailed'), variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.investor || !formData.date) {
      toast({ title: t('error'), description: t('requiredFieldsShort'), variant: "destructive" });
      return;
    }
    createOwnerInvestmentMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const goBack = () => setLocation(`/owner-investments/${projectId}`);

  const formatNum = (s: string) => s ? fmtNumber(parseFloat(s || "0"), language) : '';

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'var(--corp-bg)', fontFamily: 'var(--corp-font)', color: 'var(--corp-ink)' }}
    >
      <CorpHeader title={t('newInvestmentTitle')} subtitle={t('newInvestmentSubtitle')} onBack={goBack} />

      <main className="px-4 pt-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Amount */}
          <div className="p-4" style={SECTION_STYLE}>
            <FieldLabel required>{t('amountAedLabel')}</FieldLabel>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                placeholder="0.00"
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

          {/* Investor */}
          <div className="p-4" style={SECTION_STYLE}>
            <FieldLabel required>{t('investorLabel')}</FieldLabel>
            <Select
              value={formData.investor}
              onValueChange={(v) => handleInputChange('investor', v)}
            >
              <SelectTrigger className="h-10 text-[13px]" data-testid="select-investor">
                <SelectValue placeholder={t('selectInvestor')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vlad">{t('investorVlad')}</SelectItem>
                <SelectItem value="platon">{t('investorPlaton')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="p-4" style={SECTION_STYLE}>
            <FieldLabel required>{t('dateLabel')}</FieldLabel>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
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
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder={t('investmentDescriptionPlaceholder')}
              rows={3}
              className="text-[13px] resize-none"
              data-testid="input-description"
            />
          </div>

          {/* Buttons */}
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
              disabled={createOwnerInvestmentMutation.isPending}
              className="flex-1 h-12 text-[14px] font-semibold transition-colors disabled:opacity-50"
              style={{ background: 'var(--corp-ink)', color: '#fff', borderRadius: 'var(--corp-r)' }}
              data-testid="button-submit-investment"
            >
              {createOwnerInvestmentMutation.isPending ? t('addingProgressShort') : t('addInvestmentShort')}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
