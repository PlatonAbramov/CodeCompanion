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

export default function AddAdvance() {
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
    recipient: '',
    description: '',
    date: '',
  });

  const { data: projects = [] } = useQuery<Project[]>({ queryKey: ['/api/projects'] });
  const { data: project } = useQuery<Project>({ queryKey: ['/api/projects', projectId] });

  const createAdvanceMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('/api/advances', { method: 'POST', body: JSON.stringify(data) });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/advances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/financial-overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      if (formData.projectId) {
        queryClient.invalidateQueries({ queryKey: ['/api/projects', formData.projectId, 'advances'] });
        queryClient.invalidateQueries({ queryKey: ['/api/projects', formData.projectId, 'financial-summary'] });
      }
      toast({ title: t('success'), description: t('advanceAddedTitle') });
      goBack();
    },
    onError: () => {
      toast({ title: t('error'), description: t('advanceAddFailed'), variant: "destructive" });
    },
  });

  const goBack = () => {
    if (projectId) setLocation(`/projects/${projectId}`);
    else if (user?.role === 'admin' || user?.role === 'director') setLocation('/director');
    else setLocation('/master');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.date || !formData.recipient) {
      toast({ title: t('error'), description: t('advanceFieldsRequired'), variant: "destructive" });
      return;
    }
    createAdvanceMutation.mutate(formData);
  };

  const formatNum = (s: string) => {
    if (!s) return '';
    return fmtNumber(parseFloat(s || "0"), language);
  };

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'var(--corp-bg)', fontFamily: 'var(--corp-font)', color: 'var(--corp-ink)' }}
    >
      <CorpHeader
        title={t('newAdvanceTitle')}
        subtitle={project?.name || t('advanceFromOwnFunds')}
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
            <FieldLabel required>{t('advanceAmountLabel')}</FieldLabel>
            <div className="relative">
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(p => ({ ...p, amount: e.target.value }))}
                placeholder="0"
                required
                className="pr-14 h-12 text-[20px] font-bold"
                style={{ fontFamily: 'var(--corp-mono)', color: 'var(--corp-accent)' }}
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

          {/* Recipient */}
          <div className="p-4" style={SECTION_STYLE}>
            <FieldLabel required>{t('advanceRecipientLabel')}</FieldLabel>
            <Select
              value={formData.recipient}
              onValueChange={(v) => setFormData(p => ({ ...p, recipient: v }))}
            >
              <SelectTrigger className="h-10 text-[13px]" data-testid="select-recipient">
                <SelectValue placeholder={t('selectRecipient')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Платон">Платон</SelectItem>
                <SelectItem value="Влад">Влад</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="p-4" style={SECTION_STYLE}>
            <FieldLabel required>{t('advanceDateLabel')}</FieldLabel>
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
              placeholder={t('advanceDescriptionPlaceholder')}
              rows={3}
              className="text-[13px] resize-none"
              data-testid="input-description"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={createAdvanceMutation.isPending}
              className="w-full h-12 text-[14px] font-semibold transition-colors disabled:opacity-50"
              style={{ background: 'var(--corp-ink)', color: '#fff', borderRadius: 'var(--corp-r)' }}
              data-testid="button-submit-advance"
            >
              {createAdvanceMutation.isPending ? t('addingProgress') : t('addAdvanceAction')}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
