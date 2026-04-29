import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

interface MePersonnelResponse {
  personnel: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    isDriver: boolean;
  } | null;
}

export function useMyPersonnel() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery<MePersonnelResponse>({
    queryKey: ["/api/me/personnel"],
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
  return { personnel: data?.personnel ?? null, isLoading };
}
