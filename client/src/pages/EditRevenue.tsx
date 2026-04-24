import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CorpHeader } from "@/components/corp-ui";

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

export default function EditRevenue() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  if (user && user.role !== 'admin' && user.role !== 'director') {
    setLocation('/master');
    return null;
  }

  const pathParts = location.split('/');
  const revenueId = pathParts[pathParts.length - 1];
  const projectId = pathParts[pathParts.length - 2];

  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    source: '',
    date: new Date().toISOString().split('T')[0],
  });

  const { data: revenues, isLoading } = useQuery({
    queryKey: ['/api/projects', projectId, 'revenues'],
    enabled: !!projectId,
  });

  useEffect(() => {
    if (revenues && Array.isArray(revenues) && revenueId) {
      const revenue = revenues.find((r: any) => r.id === revenueId);
      if (revenue) {
        setFormData({
          amount: revenue.amount,
          description: revenue.description || '',
          source: revenue.source || '',
          date: new Date(revenue.date).toISOString().split('T')[0],
        });
      }
    }
  }, [revenues, revenueId]);

  const { mutate: updateRevenue, isPending } = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/revenues/${revenueId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update revenue');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Доход обновлён", description: "Изменения сохранены" });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'revenues'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'financial-summary'] });
      goBack();
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить доход",
        variant: "destructive",
      });
    },
  });

  const goBack = () => setLocation(`/revenues/${projectId}`);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount) {
      toast({ title: "Ошибка", description: "Пожалуйста, заполните все обязательные поля", variant: "destructive" });
      return;
    }
    updateRevenue({
      amount: parseFloat(formData.amount),
      description: formData.description,
      source: formData.source,
      date: formData.date,
    });
  };

  const formatNum = (s: string) => s ? parseFloat(s || "0").toLocaleString("ru-RU") : '';

  if (isLoading) {
    return <div style={{ background: 'var(--corp-bg)' }} className="min-h-screen p-4" />;
  }

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'var(--corp-bg)', fontFamily: 'var(--corp-font)', color: 'var(--corp-ink)' }}
    >
      <CorpHeader title="Редактирование дохода" subtitle="Изменение записи" onBack={goBack} />

      <main className="px-4 pt-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="p-4" style={SECTION_STYLE}>
            <FieldLabel required>Сумма</FieldLabel>
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

          <div className="p-4" style={SECTION_STYLE}>
            <FieldLabel required>Дата</FieldLabel>
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

          <div className="p-4" style={SECTION_STYLE}>
            <FieldLabel>Источник дохода</FieldLabel>
            <Input
              id="source"
              placeholder="Например: Оплата от заказчика, доп. работы"
              value={formData.source}
              onChange={(e) => setFormData(p => ({ ...p, source: e.target.value }))}
              className="h-10 text-[13px]"
              data-testid="input-source"
            />
          </div>

          <div className="p-4" style={SECTION_STYLE}>
            <FieldLabel>Описание</FieldLabel>
            <Textarea
              id="description"
              placeholder="Дополнительная информация о доходе"
              value={formData.description}
              onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
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
              Отмена
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 h-12 text-[14px] font-semibold transition-colors disabled:opacity-50"
              style={{ background: 'var(--corp-pos)', color: '#fff', borderRadius: 'var(--corp-r)' }}
              data-testid="button-save"
            >
              {isPending ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
