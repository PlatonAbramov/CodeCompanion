import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, Users, Building2, FileText, User } from "lucide-react";

interface BottomNavigationProps {
  userRole?: string;
}

export function BottomNavigation({ userRole }: BottomNavigationProps) {
  const [, setLocation] = useLocation();

  if (userRole !== 'director') {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-2 z-50">
      <div className="flex justify-around items-center max-w-lg mx-auto">
        <button
          onClick={() => setLocation('/director')}
          className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <Home size={20} className="text-slate-600" />
          <span className="text-xs text-slate-600">Главная</span>
        </button>
        
        <button
          onClick={() => setLocation('/contractors')}
          className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <Users size={20} className="text-slate-600" />
          <span className="text-xs text-slate-600">Подрядчики</span>
        </button>
        
        <button
          onClick={() => setLocation('/clients')}
          className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <Building2 size={20} className="text-slate-600" />
          <span className="text-xs text-slate-600">Заказчики</span>
        </button>
        
        <button
          onClick={() => setLocation('/employees')}
          className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <User size={20} className="text-slate-600" />
          <span className="text-xs text-slate-600">Сотрудники</span>
        </button>
      </div>
    </nav>
  );
}