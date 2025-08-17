import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ArrowLeft, MoreVertical, Download, Eye, Plus, Edit,
  FileText, Paperclip, Trash2, ChevronDown, ChevronUp,
  History, Archive, ArchiveRestore, Upload
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileUploader } from "@/components/FileUploader";
import { AssignClientModal } from "@/components/AssignClientModal";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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
  totalRevenues: string;
  totalExpenses: string;
  totalOwnerInvestments: string;
  currentProfit: string;
  projectedProfit: string;
}

interface Expense {
  id: string;
  category: string;
  amount: string;
  description?: string;
  createdAt: string;
  user: { name: string };
  contractor?: {
    name: string;
    company?: string;
  };
}

interface Document {
  id: string;
  name: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileUrl: string;
  uploadedBy: string;
  createdAt: string;
}

export default function ProjectDetail() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFinancialSummaryOpen, setIsFinancialSummaryOpen] = useState(false);
  const [isDocumentsOpen, setIsDocumentsOpen] = useState(false);
  const [isAssignClientModalOpen, setIsAssignClientModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCreateSheetDialogOpen, setIsCreateSheetDialogOpen] = useState(false);
  const [selectedInvoiceDoc, setSelectedInvoiceDoc] = useState<Document | null>(null);
  const [sheetName, setSheetName] = useState("");
  const [parseResult, setParseResult] = useState<any>(null);
  
  // Extract project ID from URL
  const projectId = location.split('/')[2];

  // Get project data
  const { data: project } = useQuery<Project>({
    queryKey: ['/api/projects', projectId],
  });

  const { data: financialSummary } = useQuery<FinancialSummary>({
    queryKey: ['/api/projects', projectId, 'financial-summary'],
    enabled: user?.role === 'admin' || user?.role === 'director',
  });

  const { data: expenses = [] } = useQuery<Expense[]>({
    queryKey: ['/api/projects', projectId, 'expenses'],
    enabled: user?.role === 'admin' || user?.role === 'director',
  });

  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ['/api/projects', projectId, 'documents'],
  });

  // Document create mutation
  const createDocumentMutation = useMutation({
    mutationFn: async (files: Array<{
      fileName: string;
      fileUrl: string;
      fileSize: number;
      mimeType: string;
    }>) => {
      const promises = files.map(file => 
        apiRequest('/api/documents', {
          method: 'POST',
          body: JSON.stringify({
            projectId: projectId,
            name: file.fileName,
            fileName: file.fileName,
            fileUrl: file.fileUrl,
            fileSize: file.fileSize,
            mimeType: file.mimeType
          })
        })
      );
      return Promise.all(promises.map(p => p.then(res => res.json())));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'documents'] });
      toast({
        title: t('success') || 'Success',
        description: t('documentsUploaded') || 'Documents uploaded successfully',
      });
    },
    onError: (error) => {
      console.error('Document creation error:', error);
      toast({
        title: t('error') || 'Error',
        description: t('uploadFailed') || 'Failed to create documents',
        variant: 'destructive',
      });
    }
  });

  // Document delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const res = await apiRequest(`/api/documents/${documentId}`, {
        method: 'DELETE'
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'documents'] });
      toast({
        title: t('success') || 'Success',
        description: t('documentDeleted') || 'Document deleted successfully',
      });
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast({
        title: t('error') || 'Error',
        description: t('deleteFailed') || 'Failed to delete document',
        variant: 'destructive',
      });
    }
  });

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount || '0');
    return `${num.toLocaleString('ru-RU')} AED`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle file upload
  const handleFilesUpload = (files: Array<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }>) => {
    createDocumentMutation.mutate(files);
  };

  const handleDeleteDocument = (documentId: string) => {
    if (window.confirm(t('confirmDelete') || 'Are you sure you want to delete this document?')) {
      deleteMutation.mutate(documentId);
    }
  };

  const handleViewDocument = (doc: Document) => {
    window.open(doc.fileUrl, '_blank');
  };

  const handleDownloadDocument = (doc: Document) => {
    // Create a temporary link element to trigger download
    const link = document.createElement('a');
    link.href = doc.fileUrl;
    link.download = doc.name; // Set the filename for download
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Project delete mutation - only for admin
  const deleteProjectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(`/api/projects/${projectId}`, {
        method: 'DELETE'
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Успех',
        description: 'Проект удален успешно',
      });
      setLocation('/');
    },
    onError: (error) => {
      console.error('Delete project error:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить проект',
        variant: 'destructive',
      });
    }
  });

  const handleDeleteProject = () => {
    deleteProjectMutation.mutate();
    setIsDeleteDialogOpen(false);
  };

  // Create implementation sheet from invoice mutation
  const createSheetFromInvoiceMutation = useMutation({
    mutationFn: async (data: { name: string; documentId: string }) => {
      const response = await fetch(`/api/projects/${projectId}/implementation-sheets/parse-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw errorData;
      }
      
      return response.json();
    },
    onSuccess: (result: any) => {
      toast({
        title: "Лист реализации создан",
        description: `Успешно создан лист "${result.sheet.name}" с ${result.parsedItems} позициями из ${result.format} документа`,
      });
      setIsCreateSheetDialogOpen(false);
      setSheetName("");
      setSelectedInvoiceDoc(null);
      setParseResult(null);
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/implementation-sheets`] });
    },
    onError: (error: any) => {
      console.error("Parse error:", error);
      setParseResult(error);
      toast({
        title: "Ошибка создания листа",
        description: error.error || "Не удалось создать лист реализации из инвойса",
        variant: "destructive"
      });
    }
  });

  const handleCreateSheetFromInvoice = (doc: Document) => {
    if (!doc.fileName.toLowerCase().startsWith('invoice')) {
      toast({
        title: "Ошибка",
        description: "Можно создавать лист реализации только из документов, начинающихся с 'invoice'",
        variant: "destructive"
      });
      return;
    }
    
    setSelectedInvoiceDoc(doc);
    setSheetName(`Лист реализации - ${doc.name}`);
    setIsCreateSheetDialogOpen(true);
  };

  const handleSubmitCreateSheet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceDoc || !sheetName.trim()) return;
    
    createSheetFromInvoiceMutation.mutate({
      name: sheetName.trim(),
      documentId: selectedInvoiceDoc.id
    });
  };
  
  // Archive/unarchive project mutation
  const archiveProjectMutation = useMutation({
    mutationFn: async (archive: boolean) => {
      const res = await apiRequest(`/api/projects/${projectId}/archive`, {
        method: 'PATCH',
        body: JSON.stringify({ archive })
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: project?.status === 'archived' ? "Проект разархивирован" : "Проект архивирован",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
    onError: (error) => {
      console.error('Archive project error:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось изменить статус проекта",
        variant: "destructive",
      });
    }
  });
  
  const handleArchive = () => {
    archiveProjectMutation.mutate(project?.status !== 'archived');
  };

  const isAdmin = user?.role === 'admin';
  const isAdminOrDirector = user?.role === 'admin' || user?.role === 'director';

  const goBack = () => {
    if (user?.role === 'admin' || user?.role === 'director') {
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
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={goBack}
                className="mr-2"
                data-testid="button-back"
              >
                <ArrowLeft size={20} />
              </Button>
              <div className="flex-1">
                <h2 className="font-semibold text-slate-900">{project.name}</h2>
                {project.location && (
                  <p className="text-sm text-slate-500">{project.location}</p>
                )}
              </div>
            </div>
            
            {/* Admin menu for project actions */}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" data-testid="button-project-menu">
                    <MoreVertical size={20} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => setLocation(`/history/${projectId}`)}
                    data-testid="menu-history"
                  >
                    <History className="h-4 w-4 mr-2" />
                    История изменений
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleArchive()}
                    data-testid="menu-archive"
                  >
                    {project.status === 'archived' ? (
                      <>
                        <ArchiveRestore className="h-4 w-4 mr-2" />
                        Разархивировать
                      </>
                    ) : (
                      <>
                        <Archive className="h-4 w-4 mr-2" />
                        Архивировать
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="text-red-600 focus:text-red-600"
                    data-testid="menu-delete-project"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Удалить проект
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      <div className="p-4 pb-20">
        {/* Action Buttons */}
        <div className="flex flex-col gap-3 mb-6">
          {isAdminOrDirector && (
            <Button 
              className="bg-primary text-white hover:bg-primary/90 px-6 py-3 rounded-full shadow-md"
              onClick={() => setLocation(`/add-expense?projectId=${projectId}`)}
            >
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center mr-3">
                <Plus size={16} className="text-white" />
              </div>
              Добавить расход
            </Button>
          )}
          
          {/* Implementation Sheets - accessible to clients */}
          <Button 
            variant="outline"
            className="px-6 py-3 rounded-full shadow-sm"
            onClick={() => setLocation(`/projects/${projectId}/implementation-sheets`)}
          >
            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
              <FileText size={16} className="text-green-600" />
            </div>
            Листы реализации
          </Button>
          
          {isAdminOrDirector && (
            <>
              <Button 
                variant="outline"
                className="px-6 py-3 rounded-full shadow-sm"
                onClick={() => setIsAssignClientModalOpen(true)}
              >
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <Plus size={16} className="text-blue-600" />
                </div>
                Назначить заказчика
              </Button>
              

            </>
          )}
        </div>

        {/* Financial Summary Card */}
        {financialSummary && isAdminOrDirector && (
          <Card className="mb-6 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <Collapsible open={isFinancialSummaryOpen} onOpenChange={setIsFinancialSummaryOpen}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between cursor-pointer -mx-4 -mt-4 px-4 pt-4 pb-2 rounded-t-lg">
                    <h3 className="font-semibold text-slate-900">{t('financialSummary')}</h3>
                    <div className="w-9 h-9 flex items-center justify-center">
                      {isFinancialSummaryOpen ? (
                        <ChevronUp size={16} className="text-slate-500" />
                      ) : (
                        <ChevronDown size={16} className="text-slate-500" />
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="space-y-4 mt-4">
                {/* Contract Value Row */}
                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50">
                  <span className="text-slate-600">Стоимость проекта по договору</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(financialSummary.totalCost)}
                  </span>
                </div>

                {/* Customer Advances Row */}
                <div 
                  className="flex justify-between items-center p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => setLocation(`/customer-advances/${projectId}`)}
                >
                  <div className="flex items-center flex-1">
                    <span className="text-slate-600">Аванс от заказчика</span>
                    {(user?.role === 'admin' || user?.role === 'director') && (
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

                {/* Owner Advances (Vlad + Platon) Row */}
                <div 
                  className="flex justify-between items-center p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => setLocation(`/advances/${projectId}`)}
                >
                  <div className="flex items-center flex-1">
                    <span className="text-slate-600">Взятые авансы (Влад + Платон)</span>
                    {(user?.role === 'admin' || user?.role === 'director') && (
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
                  <span className="font-semibold text-red-600">
                    {formatCurrency(financialSummary.totalAdvances)}
                  </span>
                </div>

                {/* Owner Investments Row */}
                <div 
                  className="flex justify-between items-center p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => setLocation(`/owner-investments/${projectId}`)}
                >
                  <div className="flex items-center flex-1">
                    <span className="text-slate-600">Вложили из своих (Влад + Платон)</span>
                    {(user?.role === 'admin' || user?.role === 'director') && (
                      <div className="flex items-center ml-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-primary hover:bg-primary/10 p-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/add-owner-investment/${projectId}`);
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
                            setLocation(`/owner-investments/${projectId}`);
                          }}
                        >
                          <Edit size={14} />
                        </Button>
                      </div>
                    )}
                  </div>
                  <span className="font-semibold text-red-600">
                    {formatCurrency(financialSummary.totalOwnerInvestments)}
                  </span>
                </div>

                {/* Expenses Row */}
                <div 
                  className="flex justify-between items-center p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => setLocation(`/expenses/${projectId}`)}
                >
                  <div className="flex items-center flex-1">
                    <span className="text-slate-600">Расходы на проект</span>
                    {(user?.role === 'admin' || user?.role === 'director') && (
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
                
                {/* Current Profit Row */}
                <div className="flex justify-between items-center p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <span className="text-blue-800 font-medium">Прибыль на данный момент</span>
                  <span className={`font-bold ${parseFloat(financialSummary.currentProfit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(financialSummary.currentProfit)}
                  </span>
                </div>

                {/* Projected Profit Row */}
                <div className="flex justify-between items-center p-3 rounded-lg bg-green-50 border border-green-200">
                  <span className="text-green-800 font-medium">Прогнозируемая прибыль</span>
                  <span className={`font-bold ${parseFloat(financialSummary.projectedProfit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(financialSummary.projectedProfit)}
                  </span>
                </div>
              </div>
              
              {(user?.role === 'admin' || user?.role === 'director') && (
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
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        )}

        {/* Project Documents */}
        <Card className="mb-6 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <Collapsible open={isDocumentsOpen} onOpenChange={setIsDocumentsOpen}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer -mx-4 -mt-4 px-4 pt-4 pb-2 rounded-t-lg">
                  <h3 className="font-semibold text-slate-900">{t('documents')}</h3>
                  <div className="w-9 h-9 flex items-center justify-center">
                    {isDocumentsOpen ? (
                      <ChevronUp size={16} className="text-slate-500" />
                    ) : (
                      <ChevronDown size={16} className="text-slate-500" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="mt-4">
                  {(user?.role === 'admin' || user?.role === 'director') && (
                    <div className="mb-4 flex justify-end">
                      <FileUploader
                        onUpload={handleFilesUpload}
                        maxFiles={5}
                        maxFileSize={50 * 1024 * 1024}
                        accept="*/*"
                      >
                        <Plus size={16} className="mr-1" />
                        {t('addDocument') || 'Add Document'}
                      </FileUploader>
                    </div>
                  )}
                  {documents.length === 0 ? (
                    <p className="text-slate-500 text-center py-4">Нет документов</p>
                  ) : (
                    <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center p-3 bg-slate-50 rounded-lg">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <FileText className="text-blue-600" size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{doc.name}</p>
                      <p className="text-sm text-slate-500">
                        {formatFileSize(doc.fileSize)} • {doc.mimeType}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleViewDocument(doc)}
                        className="text-blue-600 hover:bg-blue-50"
                        title="Просмотр документа"
                      >
                        <Eye size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDownloadDocument(doc)}
                        className="text-green-600 hover:bg-green-50"
                        title="Скачать документ"
                      >
                        <Download size={16} />
                      </Button>
                      {(user?.role === 'admin' || user?.role === 'director') && 
                       doc.fileName.toLowerCase().startsWith('invoice') && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleCreateSheetFromInvoice(doc)}
                          className="text-purple-600 hover:bg-purple-50"
                          title="Создать лист реализации из инвойса"
                        >
                          <Upload size={16} />
                        </Button>
                      )}
                      {(user?.role === 'admin' || user?.role === 'director') && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="text-red-600 hover:bg-red-50"
                          title="Удалить документ"
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </div>
                  </div>
                    ))}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

      </div>
      
      {/* Assign Client Modal */}
      <AssignClientModal 
        isOpen={isAssignClientModalOpen}
        onClose={() => setIsAssignClientModalOpen(false)}
        projectId={projectId}
      />

      {/* Delete Project Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить проект</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить проект безвозвратно? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteProject}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              Удалить проект
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Implementation Sheet from Invoice Dialog */}
      <Dialog open={isCreateSheetDialogOpen} onOpenChange={setIsCreateSheetDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Создать лист реализации из инвойса</DialogTitle>
            <DialogDescription>
              Автоматически создать лист реализации на основе загруженного инвойса "{selectedInvoiceDoc?.name}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Информация о процессе */}
            <div className="border rounded-lg p-4">
              <h4 className="text-lg font-semibold mb-3">Как это работает</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5 text-xs">1</Badge>
                  <span>Система автоматически извлечет таблицу из PDF, XLSX или CSV</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5 text-xs">2</Badge>
                  <span>Создаст позиции с наименованием, количеством, ценой и суммой</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5 text-xs">3</Badge>
                  <span>Лист реализации будет готов для работы</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmitCreateSheet} className="space-y-4">
              {/* Название листа реализации */}
              <div className="space-y-2">
                <Label htmlFor="sheet-name">Название листа реализации</Label>
                <Input
                  id="sheet-name"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  placeholder="Введите название листа..."
                  data-testid="input-sheet-name"
                  required
                />
              </div>

              {/* Поддерживаемые форматы */}
              <Alert>
                <CheckCircle className="w-4 h-4" />
                <AlertDescription>
                  <strong>Поддерживаемые форматы:</strong> PDF, XLSX, XLS, CSV
                </AlertDescription>
              </Alert>

              {/* Результат парсинга (ошибки) */}
              {parseResult && parseResult.error && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="font-medium">{parseResult.error}</div>
                      {parseResult.details && (
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {parseResult.details.map((detail: string, index: number) => (
                            <li key={index}>{detail}</li>
                          ))}
                        </ul>
                      )}
                      {parseResult.suggestColumnMapping && (
                        <div className="mt-2 text-sm">
                          <div className="font-medium">Рекомендации:</div>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Проверьте, что файл содержит таблицу с данными</li>
                            <li>Убедитесь, что есть колонки с наименованием работ</li>
                            <li>Попробуйте другой формат файла (XLSX вместо PDF)</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Кнопки */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateSheetDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  disabled={createSheetFromInvoiceMutation.isPending || !selectedInvoiceDoc || !sheetName.trim()}
                  data-testid="button-create-sheet"
                >
                  {createSheetFromInvoiceMutation.isPending ? "Создание..." : "Создать лист"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
