import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserSchema, type CreateUser, type User, type AdminAction, type LoginAttempt } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  UserPlus, 
  Shield, 
  ShieldOff, 
  RotateCcw, 
  LogOut, 
  Activity,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  activeSessions: number;
  failedLoginsToday: number;
}

export default function AdminPanel() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "blocked">("all");
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Проверяем, что пользователь - администратор
  const isAdmin = user?.email === "platonabramov90@gmail.com" || user?.username === "platonabramov90";

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Нет доступа</h2>
              <p className="text-gray-600">У вас нет прав для доступа к админ-панели.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Статистика
  const { data: stats } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/stats');
      return res.json();
    },
  });

  // Список пользователей
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users', searchTerm, filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      
      const res = await apiRequest('GET', `/api/admin/users?${params}`);
      return res.json();
    },
  });

  // Журнал действий
  const { data: adminActions } = useQuery<AdminAction[]>({
    queryKey: ['/api/admin/actions'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/actions');
      return res.json();
    },
  });

  // Логи входов
  const { data: loginAttempts } = useQuery<LoginAttempt[]>({
    queryKey: ['/api/admin/login-attempts'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/login-attempts');
      return res.json();
    },
  });

  // Форма создания пользователя
  const createUserForm = useForm<CreateUser>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      email: "",
      name: "",
      password: "",
      role: "master",
    },
  });

  // Мутация создания пользователя
  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUser) => {
      const res = await apiRequest('POST', '/api/admin/users', data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Пользователь создан успешно",
      });
      setIsCreateUserOpen(false);
      createUserForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать пользователя",
        variant: "destructive",
      });
    },
  });

  // Мутация блокировки/разблокировки пользователя
  const toggleUserBlockMutation = useMutation({
    mutationFn: async ({ userId, blocked }: { userId: string; blocked: boolean }) => {
      const res = await apiRequest('PATCH', `/api/admin/users/${userId}/block`, { blocked });
      return res.json();
    },
    onSuccess: (_, { blocked }) => {
      toast({
        title: "Успешно",
        description: blocked ? "Пользователь заблокирован" : "Пользователь разблокирован",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось изменить статус пользователя",
        variant: "destructive",
      });
    },
  });

  // Мутация сброса пароля
  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest('POST', `/api/admin/users/${userId}/reset-password`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Пароль сброшен",
        description: `Новый временный пароль: ${data.tempPassword}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось сбросить пароль",
        variant: "destructive",
      });
    },
  });

  // Мутация принудительного выхода
  const forceLogoutMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest('POST', `/api/admin/users/${userId}/force-logout`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Пользователь принудительно вышел из всех сессий",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось завершить сессии",
        variant: "destructive",
      });
    },
  });

  const onCreateUser = (data: CreateUser) => {
    createUserMutation.mutate(data);
  };

  const filteredUsers = users?.filter(user => {
    const matchesSearch = !searchTerm || 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'active' && user.isActive && !user.isBlocked) ||
      (filterStatus === 'blocked' && user.isBlocked);
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Заголовок */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Админ-панель</h1>
            <p className="text-gray-600">Управление пользователями и системой</p>
          </div>
          <Badge variant="secondary" className="px-3 py-1">
            <Shield className="h-4 w-4 mr-1" />
            Администратор
          </Badge>
        </div>

        {/* Статистика */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.totalUsers}</p>
                    <p className="text-sm text-gray-600">Всего пользователей</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.activeUsers}</p>
                    <p className="text-sm text-gray-600">Активные</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <XCircle className="h-8 w-8 text-red-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.blockedUsers}</p>
                    <p className="text-sm text-gray-600">Заблокированные</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Activity className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.activeSessions}</p>
                    <p className="text-sm text-gray-600">Активные сессии</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-8 w-8 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.failedLoginsToday}</p>
                    <p className="text-sm text-gray-600">Ошибки входа сегодня</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Вкладки */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Пользователи</TabsTrigger>
            <TabsTrigger value="actions">Журнал действий</TabsTrigger>
            <TabsTrigger value="logins">Логи входов</TabsTrigger>
          </TabsList>

          {/* Вкладка пользователей */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Управление пользователями</CardTitle>
                    <CardDescription>Создание, редактирование и управление пользователями</CardDescription>
                  </div>
                  
                  <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-create-user">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Создать пользователя
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Создать нового пользователя</DialogTitle>
                        <DialogDescription>
                          Заполните форму для создания нового пользователя
                        </DialogDescription>
                      </DialogHeader>
                      
                      <Form {...createUserForm}>
                        <form onSubmit={createUserForm.handleSubmit(onCreateUser)} className="space-y-4">
                          <FormField
                            control={createUserForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Логин</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid="input-username" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={createUserForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email (опционально)</FormLabel>
                                <FormControl>
                                  <Input {...field} type="email" data-testid="input-email" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={createUserForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Имя</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid="input-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={createUserForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Пароль</FormLabel>
                                <FormControl>
                                  <Input {...field} type="password" data-testid="input-password" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={createUserForm.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Роль</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-role">
                                      <SelectValue placeholder="Выберите роль" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="master">Мастер</SelectItem>
                                    <SelectItem value="director">Директор</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <DialogFooter>
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => setIsCreateUserOpen(false)}
                              data-testid="button-cancel"
                            >
                              Отмена
                            </Button>
                            <Button 
                              type="submit" 
                              disabled={createUserMutation.isPending}
                              data-testid="button-submit"
                            >
                              {createUserMutation.isPending ? "Создание..." : "Создать"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Поиск и фильтры */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Поиск по логину, имени или email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                        data-testid="input-search"
                      />
                    </div>
                  </div>
                  
                  <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                    <SelectTrigger className="w-[180px]" data-testid="select-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все пользователи</SelectItem>
                      <SelectItem value="active">Активные</SelectItem>
                      <SelectItem value="blocked">Заблокированные</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Таблица пользователей */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Пользователь</TableHead>
                        <TableHead>Роль</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Последний вход</TableHead>
                        <TableHead>Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                              <span className="ml-2">Загрузка...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredUsers && filteredUsers.length > 0 ? (
                        filteredUsers.map((user) => (
                          <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{user.name}</div>
                                <div className="text-sm text-gray-500">@{user.username}</div>
                                {user.email && <div className="text-sm text-gray-500">{user.email}</div>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.role === 'director' ? 'default' : 'secondary'}>
                                {user.role === 'director' ? 'Директор' : 'Мастер'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge variant={user.isActive && !user.isBlocked ? 'default' : 'destructive'}>
                                  {user.isBlocked ? 'Заблокирован' : user.isActive ? 'Активен' : 'Неактивен'}
                                </Badge>
                                {user.mustChangePassword && (
                                  <Badge variant="outline" className="text-xs">
                                    Смена пароля
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {user.lastLogin ? (
                                <div className="text-sm">
                                  {new Date(user.lastLogin).toLocaleString('ru-RU')}
                                </div>
                              ) : (
                                <span className="text-gray-400">Никогда</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant={user.isBlocked ? "default" : "destructive"}
                                  onClick={() => toggleUserBlockMutation.mutate({ 
                                    userId: user.id, 
                                    blocked: !user.isBlocked 
                                  })}
                                  disabled={toggleUserBlockMutation.isPending}
                                  data-testid={`button-toggle-block-${user.id}`}
                                >
                                  {user.isBlocked ? (
                                    <>
                                      <Shield className="h-3 w-3 mr-1" />
                                      Разблокировать
                                    </>
                                  ) : (
                                    <>
                                      <ShieldOff className="h-3 w-3 mr-1" />
                                      Заблокировать
                                    </>
                                  )}
                                </Button>
                                
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => resetPasswordMutation.mutate(user.id)}
                                  disabled={resetPasswordMutation.isPending}
                                  data-testid={`button-reset-password-${user.id}`}
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Сбросить пароль
                                </Button>
                                
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => forceLogoutMutation.mutate(user.id)}
                                  disabled={forceLogoutMutation.isPending}
                                  data-testid={`button-force-logout-${user.id}`}
                                >
                                  <LogOut className="h-3 w-3 mr-1" />
                                  Вывести везде
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <div className="text-gray-500">
                              {searchTerm || filterStatus !== 'all' 
                                ? "Пользователи не найдены" 
                                : "Пока нет пользователей"
                              }
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Вкладка журнала действий */}
          <TabsContent value="actions">
            <Card>
              <CardHeader>
                <CardTitle>Журнал действий администратора</CardTitle>
                <CardDescription>История всех действий в админ-панели</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Дата и время</TableHead>
                        <TableHead>Действие</TableHead>
                        <TableHead>Пользователь</TableHead>
                        <TableHead>Детали</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adminActions && adminActions.length > 0 ? (
                        adminActions.map((action) => (
                          <TableRow key={action.id} data-testid={`row-action-${action.id}`}>
                            <TableCell>
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-2 text-gray-400" />
                                {action.createdAt ? new Date(action.createdAt).toLocaleString('ru-RU') : '—'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{action.action}</Badge>
                            </TableCell>
                            <TableCell>
                              {action.targetUserId ? (
                                <span className="text-sm">{action.targetUserId}</span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {action.details ? (
                                <pre className="text-xs">{JSON.stringify(action.details, null, 2)}</pre>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8">
                            <div className="text-gray-500">Пока нет событий</div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Вкладка логов входов */}
          <TabsContent value="logins">
            <Card>
              <CardHeader>
                <CardTitle>Логи входов в систему</CardTitle>
                <CardDescription>История попыток входа и ошибок</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Дата и время</TableHead>
                        <TableHead>Пользователь</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>IP адрес</TableHead>
                        <TableHead>Браузер</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loginAttempts && loginAttempts.length > 0 ? (
                        loginAttempts.map((attempt) => (
                          <TableRow key={attempt.id} data-testid={`row-login-${attempt.id}`}>
                            <TableCell>
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-2 text-gray-400" />
                                {attempt.attemptTime ? new Date(attempt.attemptTime).toLocaleString('ru-RU') : '—'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                {attempt.username && <div className="font-medium">@{attempt.username}</div>}
                                {attempt.email && <div className="text-sm text-gray-500">{attempt.email}</div>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={attempt.success ? "default" : "destructive"}>
                                {attempt.success ? (
                                  <>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Успешно
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Ошибка
                                  </>
                                )}
                              </Badge>
                              {!attempt.success && attempt.failureReason && (
                                <div className="text-xs text-gray-500 mt-1">{attempt.failureReason}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-mono">{attempt.ipAddress || '—'}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-gray-500">
                                {attempt.userAgent ? attempt.userAgent.substring(0, 50) + '...' : '—'}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <div className="text-gray-500">Пока нет попыток входа</div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}