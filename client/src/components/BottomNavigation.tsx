import { useLocation } from "wouter";
import { Home, Users, Building2, Wrench } from "lucide-react";

interface BottomNavigationProps {
  currentPage?: 'home' | 'contractors' | 'clients' | 'tools' | 'employees';
}

export function BottomNavigation({ currentPage = 'home' }: BottomNavigationProps) {
  const [, setLocation] = useLocation();

  const navItems = [
    {
      key: 'home',
      icon: Home,
      label: 'Главная',
      path: '/director'
    },
    {
      key: 'contractors',
      icon: Users,
      label: 'Подрядчики', 
      path: '/contractors'
    },
    {
      key: 'clients',
      icon: Building2,
      label: 'Заказчики',
      path: '/clients'
    },
    {
      key: 'tools',
      icon: Wrench,
      label: 'Инструменты',
      path: '/tools'
    },
    {
      key: 'employees',
      icon: Users,
      label: 'Сотрудники',
      path: '/employees'
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#dfd0c1] border-t border-slate-200 px-4 py-2">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.key;
          
          return (
            <button
              key={item.key}
              className={`flex flex-col items-center py-2 ${
                isActive ? 'text-primary' : 'text-slate-400'
              }`}
              onClick={() => setLocation(item.path)}
            >
              <Icon size={20} className="mb-1" />
              <span className="text-xs">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}