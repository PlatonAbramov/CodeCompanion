import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock, User, FileText, Activity, Filter } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

function History() {
  const [match, params] = useRoute("/history/:projectId");
  const projectId = params?.projectId;
  
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });

  // Fetch audit logs
  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ["/api/audit-logs/project", projectId, entityTypeFilter, userFilter, dateRange],
    queryFn: async () => {
      if (!projectId) return [];
      
      const params = new URLSearchParams();
      if (entityTypeFilter && entityTypeFilter !== "all") params.append("entityType", entityTypeFilter);
      if (userFilter && userFilter !== "all") params.append("userId", userFilter);
      if (dateRange.from) params.append("startDate", dateRange.from.toISOString());
      if (dateRange.to) params.append("endDate", dateRange.to.toISOString());
      
      const res = await apiRequest(`/api/audit-logs/project/${projectId}?${params.toString()}`, {
        method: "GET"
      });
      return res.json();
    },
    enabled: !!projectId
  });

  // Fetch users for filter
  const { data: users } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await apiRequest("/api/users", { method: "GET" });
      return res.json();
    }
  });

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-500';
      case 'update':
        return 'bg-blue-500';
      case 'delete':
        return 'bg-red-500';
      case 'archive':
        return 'bg-gray-500';
      case 'unarchive':
        return 'bg-yellow-500';
      case 'upload':
        return 'bg-purple-500';
      case 'status_change':
        return 'bg-orange-500';
      case 'progress_change':
        return 'bg-cyan-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'create': 'Создание',
      'update': 'Изменение',
      'delete': 'Удаление',
      'archive': 'Архивирование',
      'unarchive': 'Разархивирование',
      'upload': 'Загрузка',
      'status_change': 'Смена статуса',
      'progress_change': 'Изменение прогресса',
      'complete': 'Завершение'
    };
    return labels[action] || action;
  };

  const getEntityTypeLabel = (entityType: string) => {
    const labels: Record<string, string> = {
      'project': 'Проект',
      'expense': 'Расход',
      'revenue': 'Доход',
      'advance': 'Аванс',
      'customer_advance': 'Аванс от заказчика',
      'owner_investment': 'Инвестиция владельца',
      'document': 'Документ',
      'tool': 'Инструмент',
      'contractor': 'Подрядчик',
      'client': 'Заказчик',
      'user': 'Пользователь',
      'implementation_item': 'Элемент реализации',
      'photo': 'Фото/Видео'
    };
    return labels[entityType] || entityType;
  };

  const formatFieldName = (fieldName: string) => {
    const labels: Record<string, string> = {
      'name': 'Название',
      'status': 'Статус',
      'progress': 'Прогресс',
      'amount': 'Сумма',
      'description': 'Описание',
      'totalCost': 'Общая стоимость',
      'location': 'Местоположение'
    };
    return labels[fieldName] || fieldName;
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">История изменений</h1>
          {projectId && (
            <p className="text-muted-foreground">Проект #{projectId}</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Фильтры
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Entity Type Filter */}
            <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="project">Проекты</SelectItem>
                <SelectItem value="expense">Расходы</SelectItem>
                <SelectItem value="revenue">Доходы</SelectItem>
                <SelectItem value="advance">Авансы</SelectItem>
                <SelectItem value="customer_advance">Авансы от заказчиков</SelectItem>
                <SelectItem value="document">Документы</SelectItem>
                <SelectItem value="implementation_item">Элементы реализации</SelectItem>
                <SelectItem value="contractor">Подрядчики</SelectItem>
                <SelectItem value="client">Заказчики</SelectItem>
              </SelectContent>
            </Select>

            {/* User Filter */}
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все пользователи</SelectItem>
                {users?.map((user: any) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !dateRange.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "d MMM", { locale: ru })} -{" "}
                        {format(dateRange.to, "d MMM", { locale: ru })}
                      </>
                    ) : (
                      format(dateRange.from, "d MMM yyyy", { locale: ru })
                    )
                  ) : (
                    <span>Выберите период</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range: any) => setDateRange(range || { from: undefined, to: undefined })}
                  locale={ru}
                />
              </PopoverContent>
            </Popover>
          </div>

          {(entityTypeFilter || userFilter || dateRange.from) && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setEntityTypeFilter("");
                setUserFilter("");
                setDateRange({ from: undefined, to: undefined });
              }}
            >
              Сбросить фильтры
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Журнал изменений</CardTitle>
          <CardDescription>
            Все действия, выполненные в системе
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8" />
          ) : auditLogs && auditLogs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Время</TableHead>
                  <TableHead>Действие</TableHead>
                  <TableHead>Объект</TableHead>
                  <TableHead>Изменения</TableHead>
                  <TableHead>Пользователь</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm">
                            {format(new Date(log.createdAt), "d MMM HH:mm", { locale: ru })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(log.createdAt), { 
                              locale: ru, 
                              addSuffix: true 
                            })}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(getActionBadgeColor(log.action), "text-white")}>
                        {getActionLabel(log.action)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {getEntityTypeLabel(log.entityType)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ID: {log.entityId.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.fieldName ? (
                        <div className="max-w-xs">
                          <p className="text-sm font-medium">
                            {formatFieldName(log.fieldName)}
                          </p>
                          {log.oldValue && (
                            <p className="text-xs text-muted-foreground">
                              <span className="text-red-500">-</span> {log.oldValue}
                            </p>
                          )}
                          {log.newValue && (
                            <p className="text-xs text-muted-foreground">
                              <span className="text-green-500">+</span> {log.newValue}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{log.userName}</p>
                          <p className="text-xs text-muted-foreground">
                            {log.userRole === 'admin' && 'Администратор'}
                            {log.userRole === 'director' && 'Директор'}
                            {log.userRole === 'master' && 'Мастер'}
                            {log.userRole === 'client' && 'Заказчик'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Нет записей в истории</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default History;