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
      toast({
        title: "Успешно",
        description: "Вход выполнен успешно",
      });
      
      // Immediate redirect based on user role
      if (data.user.role === 'director') {
        setLocation('/director');
      } else if (data.user.role === 'master') {
        setLocation('/master');
      }
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
      queryClient.clear();
      toast({
        title: "Успешно",
        description: "Выход выполнен успешно",
      });
      // Immediate redirect to login
      setLocation('/login');
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
  };
}