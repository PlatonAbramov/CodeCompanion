import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export default function AddRevenue() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  if (user && user.role !== 'admin' && user.role !== 'director') {
    setLocation('/master');
    return null;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const projectIdFromUrl = urlParams.get('projectId');

  const [formData, setFormData] = useState({
    projectId: projectIdFromUrl || '',
    amount: '',
    description: '',
    source: '',
    date: new Date().toISOString().split('T')[0],
  });

  const { mutate: addRevenue, isPending } = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/revenues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to add revenue');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: t('revenueAdded'), description: t('revenueAddedDescription') });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', formData.projectId, 'financial-summary'] });
      goBack();
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error.message || t('revenueAddFailed'),
        variant: "destructive",
      });
    },
  });

  const goBack = () => {
    if (projectIdFromUrl) setLocation(`/projects/${projectIdFromUrl}`);
    else if (formData.projectId) setLocation(`/projects/${formData.projectId}`);
    else if (user?.role === 'admin' || user?.role === 'director') setLocation('/director');
    else setLocation('/master');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.projectId) {
      toast({ title: t('error'), description: t('fillRequiredFields'), variant: "destructive" });
      return;
    }
    addRevenue({
      projectId: formData.projectId,
      amount: parseFloat(formData.amount),
      description: formData.description,
      source: formData.source,
      date: formData.date,
      userId: user?.id,
    });
  };

  const formatNum = (s: string) => s ? fmtNumber(parseFloat(s || "0"), language) : '';

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'var(--corp-bg)', fontFamily: 'var(--corp-font)', color: 'var(--corp-ink)' }}
    >
      <CorpHeader title={t('newRevenueTitle')} subtitle={t('newRevenueSubtitle')} onBack={goBack} />

      <main className="px-4 pt-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Amount */}
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
            <FieldLabel required>{t('dateLabel')}</FieldLabel>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(p => ({ ...p, date: e.target.value }))}
              required
              className="h-10 text-[13px]"
              style={{ fontFamily: 'var(--corp-mono)' }}
              data-testid="input-date"
            />
          </div>

          {/* Source */}
          <div className="p-4" style={SECTION_STYLE}>
            <FieldLabel>{t('revenueSourceLabel')}</FieldLabel>
            <Input
              id="source"
              placeholder={t('revenueSourcePlaceholder')}
              value={formData.source}
              onChange={(e) => setFormData(p => ({ ...p, source: e.target.value }))}
              className="h-10 text-[13px]"
              data-testid="input-source"
            />
          </div>

          {/* Description */}
          <div className="p-4" style={SECTION_STYLE}>
            <FieldLabel>{t('description')}</FieldLabel>
            <Textarea
              id="description"
              placeholder={t('revenueDescriptionPlaceholder')}
              value={formData.description}
              onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
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
              disabled={isPending}
              className="flex-1 h-12 text-[14px] font-semibold transition-colors disabled:opacity-50"
              style={{ background: 'var(--corp-pos)', color: '#fff', borderRadius: 'var(--corp-r)' }}
              data-testid="button-submit-revenue"
            >
              {isPending ? t('addingProgressShort') : t('addRevenueButton')}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
