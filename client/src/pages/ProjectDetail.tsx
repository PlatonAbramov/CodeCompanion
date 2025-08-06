import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, MoreVertical, Download, Eye, Plus, Edit,
  FileText, Paperclip
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  location?: string;
  totalCost: string;
  status: string;
  startDate?: string;
  endDate?: string;
}

interface FinancialSummary {
  totalCost: string;
  totalAdvances: string;
  totalCustomerAdvances: string;
  totalExpenses: string;
  profit: string;
}

interface Expense {
  id: string;
  category: string;
  amount: string;
  description?: string;
  createdAt: string;
  user: { name: string };
}

interface Document {
  id: string;
  name: string;
  type: string;
  fileSize?: number;
  createdAt: string;
}

export default function ProjectDetail() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  
  // Extract project ID from URL
  const projectId = location.split('/')[2];

  // Get project data
  const { data: project } = useQuery<Project>({
    queryKey: ['/api/projects', projectId],
  });

  const { data: financialSummary } = useQuery<FinancialSummary>({
    queryKey: ['/api/projects', projectId, 'financial-summary'],
  });

  const { data: expenses = [] } = useQuery<Expense[]>({
    queryKey: ['/api/projects', projectId, 'expenses'],
  });

  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ['/api/projects', projectId, 'documents'],
  });

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('ar-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const goBack = () => {
    if (user?.role === 'director') {
      setLocation('/director');
    } else {
      setLocation('/master');
    }
  };

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={goBack}
              className="mr-2"
            >
              <ArrowLeft size={20} />
            </Button>
            <div className="flex-1">
              <h2 className="font-semibold text-slate-900">{project.name}</h2>
              {project.location && (
                <p className="text-sm text-slate-500">{project.location}</p>
              )}
            </div>
            <Button variant="ghost" size="sm">
              <MoreVertical size={20} />
            </Button>
          </div>
        </div>
      </header>

      <div className="p-4 pb-20">
        {/* Financial Summary Card */}
        {financialSummary && (
          <Card className="mb-6 shadow-sm">
            <CardContent className="p-4">
              <h3 className="font-semibold text-slate-900 mb-4">{t('financialSummary')}</h3>
              
              <div className="space-y-4">
                {/* Revenue Row */}
                <div 
                  className="flex justify-between items-center p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => setLocation(`/revenues/${projectId}`)}
                >
                  <div className="flex items-center flex-1">
                    <span className="text-slate-600">{t('revenue')}</span>
                    {user?.role === 'director' && (
                      <div className="flex items-center ml-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-primary hover:bg-primary/10 p-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/add-revenue?projectId=${projectId}`);
                          }}
                        >
                          <Plus size={14} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="ml-1 text-slate-500 hover:bg-slate-100 p-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/revenues/${projectId}`);
                          }}
                        >
                          <Edit size={14} />
                        </Button>
                      </div>
                    )}
                  </div>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(financialSummary.totalCost)}
                  </span>
                </div>

                {/* Employee Advances Row */}
                <div 
                  className="flex justify-between items-center p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => setLocation(`/advances/${projectId}`)}
                >
                  <div className="flex items-center flex-1">
                    <span className="text-slate-600">Аванс выданный</span>
                    {user?.role === 'director' && (
                      <div className="flex items-center ml-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-primary hover:bg-primary/10 p-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/add-advance/${projectId}`);
                          }}
                        >
                          <Plus size={14} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="ml-1 text-slate-500 hover:bg-slate-100 p-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/advances/${projectId}`);
                          }}
                        >
                          <Edit size={14} />
                        </Button>
                      </div>
                    )}
                  </div>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(financialSummary.totalAdvances)}
                  </span>
                </div>

                {/* Customer Advances Row */}
                <div 
                  className="flex justify-between items-center p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => setLocation(`/customer-advances/${projectId}`)}
                >
                  <div className="flex items-center flex-1">
                    <span className="text-slate-600">Аванс от заказчика</span>
                    {user?.role === 'director' && (
                      <div className="flex items-center ml-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-primary hover:bg-primary/10 p-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/add-customer-advance/${projectId}`);
                          }}
                        >
                          <Plus size={14} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="ml-1 text-slate-500 hover:bg-slate-100 p-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/customer-advances/${projectId}`);
                          }}
                        >
                          <Edit size={14} />
                        </Button>
                      </div>
                    )}
                  </div>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(financialSummary.totalCustomerAdvances)}
                  </span>
                </div>

                {/* Expenses Row */}
                <div 
                  className="flex justify-between items-center p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => setLocation(`/expenses/${projectId}`)}
                >
                  <div className="flex items-center flex-1">
                    <span className="text-slate-600">{t('expenses')}</span>
                    {user?.role === 'director' && (
                      <div className="flex items-center ml-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-primary hover:bg-primary/10 p-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/add-expense?projectId=${projectId}`);
                          }}
                        >
                          <Plus size={14} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="ml-1 text-slate-500 hover:bg-slate-100 p-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/expenses/${projectId}`);
                          }}
                        >
                          <Edit size={14} />
                        </Button>
                      </div>
                    )}
                  </div>
                  <span className="font-semibold text-red-600">
                    {formatCurrency(financialSummary.totalExpenses)}
                  </span>
                </div>

                <hr className="border-slate-200" />
                
                {/* Profit Row */}
                <div 
                  className="flex justify-between items-center p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => {
                    toast({
                      title: "Прибыль",
                      description: "Функция анализа прибыли будет реализована в следующем обновлении",
                    });
                  }}
                >
                  <span className="font-semibold text-slate-900">{t('profit')}</span>
                  <span className="font-bold text-secondary">
                    {formatCurrency(financialSummary.profit)}
                  </span>
                </div>
              </div>
              
              {user?.role === 'director' && (
                <Button 
                  className="w-full mt-4 bg-slate-100 text-slate-700 hover:bg-slate-200"
                  onClick={() => {
                    toast({
                      title: "Экспорт в PDF",
                      description: "Функция экспорта в PDF будет реализована в следующем обновлении",
                    });
                  }}
                >
                  <Download size={16} className="mr-1" />
                  {t('exportPDF')}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Project Documents */}
        <Card className="mb-6 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">{t('documents')}</h3>
              {user?.role === 'director' && (
                <Button 
                  variant="link" 
                  className="text-primary text-sm font-medium p-0"
                  onClick={() => {
                    toast({
                      title: "Добавление документов",
                      description: "Функция загрузки документов будет реализована в следующем обновлении",
                    });
                  }}
                >
                  <Plus size={16} className="mr-1" />
                  {t('addDocument')}
                </Button>
              )}
            </div>
            
            {documents.length === 0 ? (
              <p className="text-slate-500 text-center py-4">Нет документов</p>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center p-3 bg-slate-50 rounded-lg">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                      <FileText className="text-red-600" size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{doc.name}</p>
                      <p className="text-sm text-slate-500">
                        {formatFileSize(doc.fileSize)}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Eye size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Expenses */}
        <Card 
          className="shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setLocation(`/expenses/${projectId}`)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">{t('recentExpenses')}</h3>
              <Button 
                variant="link" 
                className="text-primary text-sm font-medium p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setLocation(`/add-expense?projectId=${projectId}`);
                }}
              >
                <Plus size={16} className="mr-1" />
                {t('addExpense')}
              </Button>
            </div>
            
            {expenses.length === 0 ? (
              <p className="text-slate-500 text-center py-4">Нет расходов</p>
            ) : (
              <div className="space-y-3">
                {expenses.slice(0, 5).map((expense) => (
                  <div key={expense.id} className="flex items-start justify-between py-3 border-b border-slate-100 last:border-b-0">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{expense.category}</p>
                      {expense.description && (
                        <p className="text-sm text-slate-500">{expense.description}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        <span>{expense.user.name}</span> • <span>{formatDate(expense.createdAt)}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">
                        {formatCurrency(expense.amount)}
                      </p>
                      <div className="flex items-center mt-1">
                        <Paperclip className="text-slate-400" size={12} />
                        <span className="text-xs text-slate-400 ml-1">Чек</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
