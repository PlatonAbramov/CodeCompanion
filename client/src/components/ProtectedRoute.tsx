import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import Login from "@/pages/Login";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'director' | 'master';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return; // Don't do anything while loading

    if (!user) {
      // User is not authenticated, redirect to login if not already there
      if (location !== '/login' && location !== '/') {
        setLocation('/login');
      }
      return;
    }

    // User is authenticated
    if (location === '/login' || location === '/') {
      // Redirect authenticated user from login page to appropriate dashboard
      if (user.role === 'admin' || user.role === 'director') {
        setLocation('/director');
      } else if (user.role === 'master') {
        setLocation('/master');
      } else if (user.role === 'client') {
        setLocation('/clients');
      }
      return;
    }

    if (requiredRole && user.role !== requiredRole) {
      // User doesn't have required role, redirect to their dashboard
      if (user.role === 'admin' || user.role === 'director') {
        setLocation('/director');
      } else if (user.role === 'master') {
        setLocation('/master');
      } else if (user.role === 'client') {
        setLocation('/clients');
      }
      return;
    }
  }, [user, isLoading, location, setLocation, requiredRole]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#423731] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-500">Загрузка...</p>
        </div>
      </div>
    );
  }

  // If not authenticated and on login/home page, show login
  if (!user && (location === '/login' || location === '/')) {
    return <Login />;
  }

  // If not authenticated on any other page, don't render anything (will redirect)
  if (!user) {
    return null;
  }

  // If role is required and user doesn't have it, don't render anything (will redirect)
  if (requiredRole && user.role !== requiredRole) {
    return null;
  }

  // User is authenticated and has required role, show content
  return <>{children}</>;
}