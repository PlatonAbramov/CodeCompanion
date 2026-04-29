import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

interface MePermissionsResponse {
  permissions: Record<string, boolean>;
}

export function usePermissions() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery<MePermissionsResponse>({
    queryKey: ["/api/permissions/me"],
    enabled: !!user,
    staleTime: 60_000,
  });
  const map = data?.permissions ?? {};
  const has = (key: string): boolean => {
    if (!user) return false;
    if (user.role === "admin") return true;
    return map[key] === true;
  };
  const hasAny = (...keys: string[]): boolean => keys.some((k) => has(k));
  return { has, hasAny, isLoading, permissions: map };
}
