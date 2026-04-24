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

export default function EditAdvance() {
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
  const advanceId = pathParts[pathParts.length - 1];
  const projectId = pathParts[pathParts.length - 2];

  const [formData, setFormData] = useState({
    amount: '',
    recipient: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const { data: advances, isLoading } = useQuery({
    queryKey: ['/api/projects', projectId, 'advances'],
    enabled: !!projectId,
  });

  useEffect(() => {
    if (advances && Array.isArray(advances) && advanceId) {
      const advance = advances.find((a: any) => a.id === advanceId);
      if (advance) {
        setFormData({
          amount: advance.amount,
          recipient: advance.recipient || '',
          description: advance.description || '',
          date: new Date(advance.date).toISOString().split('T')[0],
        });
      }
    }
  }, [advances, advanceId]);

  const { mutate: updateAdvance, isPending } = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/advances/${advanceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update advance');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Аванс обновлён", description: "Изменения сохранены" });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'advances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'financial-summary'] });
      goBack();
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить аванс",
        variant: "destructive",
      });
    },
  });

  const goBack = () => setLocation(`/advances/${projectId}`);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.recipient || !formData.date) {
      toast({ title: "Ошибка", description: "Пожалуйста, заполните все обязательные поля", variant: "destructive" });
      return;
    }
    updateAdvance({
      amount: parseFloat(formData.amount),
      recipient: formData.recipient,
      description: formData.description,
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
      <CorpHeader title="Редактирование аванса" subtitle="Изменение записи" onBack={goBack} />

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

          <div className="p-4" style={SECTION_STYLE}>
            <FieldLabel required>Получатель</FieldLabel>
            <Input
              id="recipient"
              placeholder="Имя получателя аванса"
              value={formData.recipient}
              onChange={(e) => setFormData(p => ({ ...p, recipient: e.target.value }))}
              required
              className="h-10 text-[13px]"
              data-testid="input-recipient"
            />
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
            <FieldLabel>Описание</FieldLabel>
            <Textarea
              id="description"
              placeholder="Дополнительная информация об авансе"
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
              style={{ background: 'var(--corp-ink)', color: '#fff', borderRadius: 'var(--corp-r)' }}
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
