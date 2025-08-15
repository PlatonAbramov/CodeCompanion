import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  username: string;
  name: string;
  role: 'director' | 'master';
}

interface LoginData {
  username: string;
  password: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [forceUpdate, setForceUpdate] = useState(0);

  // Check authentication on mount
  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      try {
        const res = await apiRequest('GET', '/api/auth/me');
        if (res.ok) {
          const userData = await res.json();
          if (isMounted) {
            setUser(userData.user);
          }
        }
      } catch (error) {
        // User not authenticated
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const res = await apiRequest('POST', '/api/auth/login', data);
      return res.json();
    },
    onSuccess: (data) => {
      setUser(data.user);
      setIsLoading(false);
      setForceUpdate(prev => prev + 1);
      toast({
        title: "Успешно",
        description: "Вход выполнен успешно",
      });
      
      // Force page reload to ensure clean state
      setTimeout(() => {
        if (data.user.role === 'director') {
          window.location.href = '/director';
        } else if (data.user.role === 'master') {
          window.location.href = '/master';
        }
      }, 500);
    },
    onError: (error: any) => {
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
      const res = await apiRequest('POST', '/api/auth/logout');
      return res.json();
    },
    onSuccess: () => {
      setUser(null);
      setIsLoading(false);
      setForceUpdate(prev => prev + 1);
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
    forceUpdate // Include force update in return to trigger re-render
  };
}