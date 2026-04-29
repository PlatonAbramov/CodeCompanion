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
    // Короткий staleTime + лёгкий polling — чтобы изменения роли/прав
    // (выполненные другим админом) подхватывались максимум за ~30 секунд
    // и сразу при возврате во вкладку.
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
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
