import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, HardHat, MoreVertical } from "lucide-react";
import { CorpHeader, CorpEmpty, fmtDateRu } from "@/components/corp-ui";

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export default function EmployeeManagement() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [employeeForm, setEmployeeForm] = useState({
    username: '',
    password: '',
    name: '',
    role: 'master',
  });

  if (user?.role !== 'admin' && user?.role !== 'director') {
    setLocation('/director');
    return null;
  }

  const { data: employees = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('/api/users', { method: 'POST', body: JSON.stringify(data) });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsCreateModalOpen(false);
      setEmployeeForm({ username: '', password: '', name: '', role: 'master' });
      toast({ title: "Успешно", description: "Сотрудник добавлен" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось добавить сотрудника", variant: "destructive" });
    },
  });

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate(employeeForm);
  };

  const formatLastLogin = (dateString?: string) => {
    if (!dateString) return 'Никогда';
    const d = new Date(dateString);
    return `${fmtDateRu(dateString)} ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const filteredEmployees = employees.filter((emp) => emp.id !== user?.id);

  const roleColor = (role: string) => {
    switch (role) {
      case 'admin': return { bg: 'var(--corp-neg-soft)', fg: 'var(--corp-neg)' };
      case 'director': return { bg: 'var(--corp-accent-soft)', fg: 'var(--corp-accent)' };
      case 'master': return { bg: 'var(--corp-pos-soft)', fg: 'var(--corp-pos)' };
      case 'client': return { bg: 'var(--corp-surface-2)', fg: 'var(--corp-ink-3)' };
      default: return { bg: 'var(--corp-surface-2)', fg: 'var(--corp-muted)' };
    }
  };

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'var(--corp-bg)', fontFamily: 'var(--corp-font)', color: 'var(--corp-ink)' }}
    >
      <CorpHeader
        title={t('employees') || 'Сотрудники'}
        subtitle={`Всего: ${filteredEmployees.length}`}
        onBack={() => setLocation('/director')}
        action={
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 h-9 px-3 text-[13px] font-semibold transition-colors"
                style={{ background: 'var(--corp-ink)', color: '#fff', borderRadius: 'var(--corp-r)' }}
                data-testid="button-add-employee"
              >
                <Plus size={14} /> <span className="hidden sm:inline">{t('addEmployee') || 'Сотрудник'}</span>
              </button>
            </DialogTrigger>
            <DialogContent className="w-full max-w-lg">
              <DialogHeader>
                <DialogTitle>{t('addEmployee') || 'Добавить сотрудника'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateEmployee} className="space-y-4">
                <div>
                  <Label>{t('employeeName') || 'Имя'} *</Label>
                  <Input
                    value={employeeForm.name}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                    placeholder="Введите полное имя"
                    required
                    data-testid="input-employee-name"
                  />
                </div>
                <div>
                  <Label>{t('username') || 'Логин'} *</Label>
                  <Input
                    value={employeeForm.username}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, username: e.target.value })}
                    placeholder="Логин для входа"
                    required
                    data-testid="input-employee-username"
                  />
                </div>
                <div>
                  <Label>{t('password') || 'Пароль'} *</Label>
                  <Input
                    type="password"
                    value={employeeForm.password}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, password: e.target.value })}
                    placeholder="Пароль"
                    required
                    data-testid="input-employee-password"
                  />
                </div>
                <div>
                  <Label>{t('role') || 'Роль'} *</Label>
                  <Select
                    value={employeeForm.role}
                    onValueChange={(v) => setEmployeeForm({ ...employeeForm, role: v })}
                  >
                    <SelectTrigger data-testid="select-employee-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="master">{t('master') || 'Мастер'}</SelectItem>
                      <SelectItem value="director">{t('director') || 'Директор'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createUserMutation.isPending}
                  data-testid="button-confirm-add-employee"
                >
                  {createUserMutation.isPending ? (t('loading') || 'Загрузка...') : (t('addEmployee') || 'Добавить')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <main className="px-4 pt-4">
        {isLoading ? null : filteredEmployees.length === 0 ? (
          <CorpEmpty
            icon={<HardHat size={28} />}
            title="Пока нет сотрудников"
            description="Добавьте первого, чтобы начать работу"
            actionLabel={t('addEmployee') || 'Добавить'}
            onAction={() => setIsCreateModalOpen(true)}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {filteredEmployees.map((employee) => {
              const rc = roleColor(employee.role);
              return (
                <div
                  key={employee.id}
                  className="p-4"
                  style={{
                    background: 'var(--corp-surface)',
                    border: '1px solid var(--corp-line)',
                    borderRadius: 'var(--corp-r-lg)',
                  }}
                  data-testid={`employee-card-${employee.id}`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--corp-surface-2)', color: 'var(--corp-ink-2)' }}
                    >
                      <HardHat size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4
                        className="text-[14px] font-semibold truncate"
                        style={{ color: 'var(--corp-ink)', letterSpacing: '-0.1px' }}
                      >
                        {employee.name}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                          style={{ background: rc.bg, color: rc.fg, letterSpacing: '0.04em' }}
                        >
                          {t(employee.role) || employee.role}
                        </span>
                        <span
                          className="text-[11px]"
                          style={{ color: 'var(--corp-muted)', fontFamily: 'var(--corp-mono)' }}
                        >
                          @{employee.username}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span
                        className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                        style={{
                          background: employee.isActive ? 'var(--corp-pos-soft)' : 'var(--corp-neg-soft)',
                          color: employee.isActive ? 'var(--corp-pos)' : 'var(--corp-neg)',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {employee.isActive ? 'Активен' : 'Неактивен'}
                      </span>
                      <button
                        type="button"
                        className="w-7 h-7 rounded flex items-center justify-center transition-colors"
                        style={{ color: 'var(--corp-ink-3)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--corp-surface-2)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <MoreVertical size={15} />
                      </button>
                    </div>
                  </div>

                  <div
                    className="grid grid-cols-2 gap-3 pt-3"
                    style={{ borderTop: '1px solid var(--corp-line)' }}
                  >
                    <div>
                      <p
                        className="text-[9px] uppercase font-bold"
                        style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}
                      >
                        {t('lastLogin') || 'Последний вход'}
                      </p>
                      <p
                        className="text-[12px]"
                        style={{ color: 'var(--corp-ink-2)', fontFamily: 'var(--corp-mono)' }}
                      >
                        {formatLastLogin(employee.lastLogin)}
                      </p>
                    </div>
                    <div>
                      <p
                        className="text-[9px] uppercase font-bold"
                        style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}
                      >
                        Зарегистрирован
                      </p>
                      <p
                        className="text-[12px]"
                        style={{ color: 'var(--corp-ink-2)', fontFamily: 'var(--corp-mono)' }}
                      >
                        {fmtDateRu(employee.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
