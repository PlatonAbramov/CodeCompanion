import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  username: string;
  email?: string;
  name: string;
  role: 'admin' | 'director' | 'master' | 'worker' | 'client';
}

interface LoginData {
  username: string;
  password: string;
}

const AUTH_KEY = ['auth', 'me'] as const;

async function fetchAuthMe(): Promise<User | null> {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (res.status === 401) return null;
    if (!res.ok) return null;
    const data = await res.json();
    return data.user ?? null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Один запрос на всю сессию: данные шарятся между всеми компонентами,
  // которые вызывают useAuth. Инвалидация только при login/logout.
  const {
    data: user = null,
    isLoading,
  } = useQuery<User | null>({
    queryKey: AUTH_KEY,
    queryFn: fetchAuthMe,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const res = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return res.json();
    },
    onSuccess: (data) => {
      // Сразу кладём пользователя в кэш — useAuth увидит обновлённые данные
      queryClient.setQueryData(AUTH_KEY, data.user);
      toast({
        title: "Успешно",
        description: "Вход выполнен успешно",
      });

      // Force page reload to ensure clean state
      setTimeout(() => {
        if (data.user.role === 'admin' || data.user.role === 'director') {
          window.location.href = '/director';
        } else if (data.user.role === 'master') {
          window.location.href = '/master';
        } else if (data.user.role === 'worker') {
          window.location.href = '/worker';
        } else if (data.user.role === 'client') {
          window.location.href = '/client'; // На случай, если будет страница клиента
        }
      }, 500);
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Неверный логин или пароль",
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('/api/auth/logout', {
        method: 'POST'
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(AUTH_KEY, null);
      queryClient.clear();
      toast({
        title: "Успешно",
        description: "Выход выполнен успешно",
      });
      // Force page reload to ensure clean state
      setTimeout(() => {
        window.location.href = '/login';
      }, 500);
    },
  });

  const login = (data: LoginData) => {
    loginMutation.mutate(data);
  };

  const logout = () => {
    logoutMutation.mutate();
  };

  return {
    user,
    isLoading,
    login,
    logout,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    forceUpdate: 0,
  };
}
