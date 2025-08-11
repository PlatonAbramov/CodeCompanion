import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Plus } from "lucide-react";

interface QuickAddContractorProps {
  onContractorAdded: (contractorId: string) => void;
}

interface ContractorForm {
  name: string;
  company: string;
  phone: string;
  email: string;
  specialization: string;
}

export function QuickAddContractor({ onContractorAdded }: QuickAddContractorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<ContractorForm>({
    name: '',
    company: '',
    phone: '',
    email: '',
    specialization: ''
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createContractorMutation = useMutation({
    mutationFn: async (contractorData: ContractorForm) => {
      const response = await apiRequest('/api/contractors', 'POST', contractorData);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/contractors'] });
      setIsOpen(false);
      setForm({
        name: '',
        company: '',
        phone: '',
        email: '',
        specialization: ''
      });
      toast({
        title: "Подрядчик добавлен",
        description: "Новый подрядчик успешно добавлен",
      });
      onContractorAdded(data.id);
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось добавить подрядчика",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.specialization.trim()) {
      toast({
        title: "Ошибка",
        description: "Заполните обязательные поля",
        variant: "destructive",
      });
      return;
    }
    createContractorMutation.mutate(form);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="ml-2"
      >
        <Plus size={16} />
        Добавить
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Быстрое добавление подрядчика</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Имя *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Введите имя"
                required
              />
            </div>

            <div>
              <Label htmlFor="company">Компания</Label>
              <Input
                id="company"
                value={form.company}
                onChange={(e) => setForm(prev => ({ ...prev, company: e.target.value }))}
                placeholder="Название компании"
              />
            </div>

            <div>
              <Label htmlFor="specialization">Специализация *</Label>
              <Input
                id="specialization"
                value={form.specialization}
                onChange={(e) => setForm(prev => ({ ...prev, specialization: e.target.value }))}
                placeholder="Например: Сантехник, Электрик"
                required
              />
            </div>

            <div>
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+7 (999) 123-45-67"
                type="tel"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={form.email}
                onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@example.com"
                type="email"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1"
                disabled={createContractorMutation.isPending}
              >
                Отмена
              </Button>
              <Button 
                type="submit"
                className="flex-1"
                disabled={createContractorMutation.isPending}
              >
                {createContractorMutation.isPending ? "Добавляем..." : "Добавить"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}