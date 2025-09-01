import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { Home, Users, Receipt, Wrench, Users as StaffIcon, LogOut, UserCheck } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  // Показываем нижнюю навигацию только для аутентифицированных пользователей
  const showBottomNav = user && location !== '/login';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Основной контент с отступом снизу для навигации */}
      <div className={showBottomNav ? "pb-20" : ""}> 
        {children}
      </div>
      
      {/* Фиксированная нижняя навигация */}
      {showBottomNav && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
          <div className="flex justify-around items-center h-16 px-4">
            
            {/* Навигация для клиентов - только заказчики */}
            {user?.role === 'client' ? (
              <>
                <Link href="/client-projects" data-testid="nav-clients">
                  <div className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
                    location.startsWith('/client-projects') 
                      ? 'text-blue-600 bg-blue-50' 
                      : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                  }`}>
                    <Receipt size={20} />
                    <span className="text-xs mt-1">Мои проекты</span>
                  </div>
                </Link>
                
                {/* Кнопка выхода для клиентов */}
                <button
                  onClick={() => {
                    console.log('Client logout clicked');
                    logout();
                  }}
                  className="flex flex-col items-center justify-center p-2 rounded-lg transition-colors text-gray-600 hover:text-blue-600 hover:bg-gray-50"
                  data-testid="nav-logout"
                >
                  <LogOut size={20} />
                  <span className="text-xs mt-1">Выход</span>
                </button>
              </>
            ) : (
              <>
                {/* Главная - только для не-клиентов */}
                <Link href={user?.role === 'master' ? '/master' : '/director'} data-testid="nav-home">
                  <div className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
                    location === '/director' || location === '/master' || location === '/admin' 
                      ? 'text-blue-600 bg-blue-50' 
                      : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                  }`}>
                    <Home size={20} />
                    <span className="text-xs mt-1">Главная</span>
                  </div>
                </Link>

                {/* Подрядчики - видны всем кроме заказчиков */}
                <Link href="/contractors" data-testid="nav-contractors">
                  <div className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
                    location.startsWith('/contractors') 
                      ? 'text-blue-600 bg-blue-50' 
                      : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                  }`}>
                    <Users size={20} />
                    <span className="text-xs mt-1">Подрядчики</span>
                  </div>
                </Link>

                {/* Заказчики - видны всем кроме мастеров */}
                {user?.role !== 'master' && (
                  <Link href="/clients" data-testid="nav-clients">
                    <div className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
                      location.startsWith('/clients') 
                        ? 'text-blue-600 bg-blue-50' 
                        : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                    }`}>
                      <Receipt size={20} />
                      <span className="text-xs mt-1">Заказчики</span>
                    </div>
                  </Link>
                )}

                {/* Инструменты - для admin/director/master */}
                {(user?.role === 'admin' || user?.role === 'director' || user?.role === 'master') && (
                  <Link href="/tools" data-testid="nav-tools">
                    <div className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
                      location.startsWith('/tools') 
                        ? 'text-blue-600 bg-blue-50' 
                        : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                    }`}>
                      <Wrench size={20} />
                      <span className="text-xs mt-1">Инструменты</span>
                    </div>
                  </Link>
                )}

                {/* Персонал (только для admin/director) */}
                {(user?.role === 'admin' || user?.role === 'director') && (
                  <Link href="/personnel" data-testid="nav-personnel">
                    <div className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
                      location.startsWith('/personnel') 
                        ? 'text-blue-600 bg-blue-50' 
                        : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                    }`}>
                      <UserCheck size={20} />
                      <span className="text-xs mt-1">Персонал</span>
                    </div>
                  </Link>
                )}

                {/* Сотрудники (только для admin/director) */}
                {(user?.role === 'admin' || user?.role === 'director') && (
                  <Link href="/admin" data-testid="nav-staff">
                    <div className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
                      location.startsWith('/admin') 
                        ? 'text-blue-600 bg-blue-50' 
                        : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                    }`}>
                      <StaffIcon size={20} />
                      <span className="text-xs mt-1">Сотрудники</span>
                    </div>
                  </Link>
                )}
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
