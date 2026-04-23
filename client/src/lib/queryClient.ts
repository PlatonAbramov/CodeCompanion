import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  options?: {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
  }
): Promise<Response> {
  const method = options?.method || "GET";
  const headers = {
    "Content-Type": "application/json",
    ...options?.headers,
  };
  
  const res = await fetch(url, {
    method,
    headers,
    body: options?.body,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      // Данные считаются свежими 30 сек — за это время повторное монтирование
      // компонента не вызовет новый запрос.
      staleTime: 30_000,
      // Кэш живёт 5 минут после того, как ни один компонент его не использует.
      gcTime: 5 * 60_000,
      // Не перезапрашивать автоматически — данные обновляются точечной
      // инвалидацией после мутаций.
      refetchOnWindowFocus: false,
      // Если данные свежие (< staleTime) — берём из кэша, спиннера нет.
      // Если устарели или были инвалидированы мутацией — автоматически
      // подтягиваем свежие. Это ключ к тому, чтобы после создания/удаления
      // данные обновлялись без F5.
      refetchOnMount: true,
      refetchOnReconnect: false,
      retry: 1,
      // При повторном открытии страницы показываем прошлые данные мгновенно,
      // свежие подтягиваются в фоне (если staleTime истёк).
      placeholderData: (prev: unknown) => prev,
    },
    mutations: {
      retry: 0,
    },
  },
});
