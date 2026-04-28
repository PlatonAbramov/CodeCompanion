import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

interface OwnerInvestment {
  id: string;
  amount: string;
  investor: 'vlad' | 'platon';
  description?: string;
  date: string;
  projectId: string;
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

export default function EditOwnerInvestment() {
  const [location, setLocation] = useLocation();
  useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const ownerInvestmentId = location.split('/')[2];

  const [formData, setFormData] = useState({
    amount: '',
    investor: '',
    description: '',
    date: '',
  });

  const { data: ownerInvestment, isLoading } = useQuery<OwnerInvestment>({
    queryKey: ['/api/owner-investments', ownerInvestmentId],
    enabled: !!ownerInvestmentId,
  });

  useEffect(() => {
    if (ownerInvestment) {
      setFormData({
        amount: ownerInvestment.amount,
        investor: ownerInvestment.investor,
        description: ownerInvestment.description || '',
        date: new Date(ownerInvestment.date).toISOString().split('T')[0],
      });
    }
  }, [ownerInvestment]);

  const updateOwnerInvestmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest(`/api/owner-investments/${ownerInvestmentId}`, {
        method: 'PUT', body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', ownerInvestment?.projectId, 'owner-investments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', ownerInvestment?.projectId, 'financial-summary'] });
      toast({ title: t('success'), description: t('investmentUpdated') });
      setLocation(`/owner-investments/${ownerInvestment?.projectId}`);
    },
    onError: () => {
      toast({ title: t('error'), description: t('investmentUpdateFailed'), variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.investor || !formData.date) {
      toast({ title: t('error'), description: t('requiredFieldsShort'), variant: "destructive" });
      return;
    }
    updateOwnerInvestmentMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatNum = (s: string) => s ? fmtNumber(parseFloat(s || "0"), language) : '';

  if (isLoading) {
    return <div style={{ background: 'var(--corp-bg)' }} className="min-h-screen p-4" />;
  }

  if (!ownerInvestment) {
    return (
      <div style={{ background: 'var(--corp-bg)' }} className="min-h-screen p-4">
        <p style={{ color: 'var(--corp-muted)' }} className="text-[13px]">{t('investmentNotFound')}</p>
      </div>
    );
  }

  const goBack = () => setLocation(`/owner-investments/${ownerInvestment.projectId}`);

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'var(--corp-bg)', fontFamily: 'var(--corp-font)', color: 'var(--corp-ink)' }}
    >
      <CorpHeader title={t('editInvestmentTitle')} subtitle={t('newInvestmentSubtitle')} onBack={goBack} />

      <main className="px-4 pt-4">
        <form onSubmit={handleSubmit} className="space-y-3">
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
              disabled={updateOwnerInvestmentMutation.isPending}
              className="flex-1 h-12 text-[14px] font-semibold transition-colors disabled:opacity-50"
              style={{ background: 'var(--corp-ink)', color: '#fff', borderRadius: 'var(--corp-r)' }}
              data-testid="button-save"
            >
              {updateOwnerInvestmentMutation.isPending ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
