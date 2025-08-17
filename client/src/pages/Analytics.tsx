import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, TrendingUp, TrendingDown, Users, Package, Wrench, DollarSign, FileText, BarChart } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

function Analytics() {
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedContractor, setSelectedContractor] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<string>("");

  // Fetch project analytics
  const { data: projectAnalytics, isLoading: loadingProjects } = useQuery({
    queryKey: ["/api/analytics/projects", statusFilter, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      if (dateRange.from) params.append("startDate", dateRange.from.toISOString());
      if (dateRange.to) params.append("endDate", dateRange.to.toISOString());
      
      const res = await apiRequest(`/api/analytics/projects?${params.toString()}`, {
        method: "GET"
      });
      return res.json();
    }
  });

  // Fetch contractor analytics
  const { data: contractorAnalytics, isLoading: loadingContractors } = useQuery({
    queryKey: ["/api/analytics/contractors", selectedContractor],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedContractor) params.append("contractorId", selectedContractor);
      
      const res = await apiRequest(`/api/analytics/contractors?${params.toString()}`, {
        method: "GET"
      });
      return res.json();
    }
  });

  // Fetch client analytics
  const { data: clientAnalytics, isLoading: loadingClients } = useQuery({
    queryKey: ["/api/analytics/clients", selectedClient],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedClient) params.append("clientId", selectedClient);
      
      const res = await apiRequest(`/api/analytics/clients?${params.toString()}`, {
        method: "GET"
      });
      return res.json();
    }
  });

  // Fetch tools analytics
  const { data: toolsAnalytics, isLoading: loadingTools } = useQuery({
    queryKey: ["/api/analytics/tools"],
    queryFn: async () => {
      const res = await apiRequest("/api/analytics/tools", {
        method: "GET"
      });
      return res.json();
    }
  });

  // Fetch all contractors for filter
  const { data: contractors } = useQuery({
    queryKey: ["/api/contractors"],
    queryFn: async () => {
      const res = await apiRequest("/api/contractors", { method: "GET" });
      return res.json();
    }
  });

  // Fetch all clients for filter
  const { data: clients } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const res = await apiRequest("/api/clients", { method: "GET" });
      return res.json();
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Аналитика и отчеты</h1>
        
        {/* Date Range Filter */}
        <div className="flex gap-2">
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
                      {format(dateRange.from, "d MMM yyyy", { locale: ru })} -{" "}
                      {format(dateRange.to, "d MMM yyyy", { locale: ru })}
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
          
          <Button
            variant="outline"
            onClick={() => setDateRange({ from: undefined, to: undefined })}
          >
            Сбросить
          </Button>
        </div>
      </div>

      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="projects">Проекты</TabsTrigger>
          <TabsTrigger value="contractors">Подрядчики</TabsTrigger>
          <TabsTrigger value="clients">Заказчики</TabsTrigger>
          <TabsTrigger value="tools">Инструменты</TabsTrigger>
        </TabsList>

        {/* Projects Analytics */}
        <TabsContent value="projects" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Активные проекты</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {projectAnalytics?.activeCount || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Проекты в работе
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Архивные проекты</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {projectAnalytics?.archivedCount || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Завершенные проекты
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Средний прогресс</CardTitle>
                <BarChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPercent(projectAnalytics?.averageProgress || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  По всем проектам
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Общая стоимость</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(projectAnalytics?.totalContractValue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Сумма всех контрактов
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Расходы</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(projectAnalytics?.totalExpenses || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Общие расходы
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Платежи</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(projectAnalytics?.totalPayments || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Полученные платежи
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Status Filter */}
          <Card>
            <CardHeader>
              <CardTitle>Фильтр по статусу</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Все статусы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="active">Активные</SelectItem>
                  <SelectItem value="completed">Завершенные</SelectItem>
                  <SelectItem value="paused">Приостановленные</SelectItem>
                  <SelectItem value="archived">Архивные</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contractors Analytics */}
        <TabsContent value="contractors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Аналитика по подрядчикам</CardTitle>
              <CardDescription>
                Выберите подрядчика для детальной информации
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedContractor} onValueChange={setSelectedContractor}>
                <SelectTrigger className="w-full max-w-sm mb-4">
                  <SelectValue placeholder="Выберите подрядчика" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все подрядчики</SelectItem>
                  {contractors?.map((contractor: any) => (
                    <SelectItem key={contractor.id} value={contractor.id}>
                      {contractor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {contractorAnalytics && contractorAnalytics.length > 0 && (
                <div className="space-y-4">
                  {contractorAnalytics.map((contractor: any) => (
                    <Card key={contractor.contractorId}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle>{contractor.contractorName}</CardTitle>
                            <CardDescription>{contractor.specialization}</CardDescription>
                          </div>
                          <Badge>{contractor.totalProjects} проектов</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Бюджет</p>
                            <p className="text-lg font-semibold">
                              {formatCurrency(Number(contractor.totalBudget))}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Расходы</p>
                            <p className="text-lg font-semibold text-red-600">
                              {formatCurrency(Number(contractor.totalExpenses))}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clients Analytics */}
        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Аналитика по заказчикам</CardTitle>
              <CardDescription>
                Выберите заказчика для детальной информации
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="w-full max-w-sm mb-4">
                  <SelectValue placeholder="Выберите заказчика" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все заказчики</SelectItem>
                  {clients?.map((client: any) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {clientAnalytics && clientAnalytics.length > 0 && (
                <div className="space-y-4">
                  {clientAnalytics.map((client: any) => (
                    <Card key={client.clientId}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle>{client.clientName}</CardTitle>
                          <Badge>{client.totalProjects} проектов</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Сумма контрактов</p>
                            <p className="text-lg font-semibold">
                              {formatCurrency(Number(client.totalContractValue))}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Оплачено</p>
                            <p className="text-lg font-semibold text-green-600">
                              {formatCurrency(Number(client.totalPayments))}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tools Analytics */}
        <TabsContent value="tools" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Всего инструментов</CardTitle>
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {toolsAnalytics?.totalTools || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  В базе данных
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Доступно</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {toolsAnalytics?.availableTools || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  На складе
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Выдано</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {toolsAnalytics?.outTools || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  В работе
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Списано</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {toolsAnalytics?.writtenOffTools || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Выведено из эксплуатации
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Общая стоимость</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(Number(toolsAnalytics?.totalValue || 0))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Стоимость всех инструментов
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Всего операций</CardTitle>
                <BarChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {toolsAnalytics?.totalMovements || 0}
                </div>
                <div className="text-xs text-muted-foreground space-y-1 mt-2">
                  <p>Выдач: {toolsAnalytics?.totalIssues || 0}</p>
                  <p>Возвратов: {toolsAnalytics?.totalReturns || 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Analytics;