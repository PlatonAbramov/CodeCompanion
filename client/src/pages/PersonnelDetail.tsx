import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, Edit, Trash2, Plus, User, Phone, Mail, 
  Calendar, Briefcase, FileText, AlertTriangle, Download,
  Upload, DollarSign, MapPin, Eye, X
} from "lucide-react";
import { format, differenceInDays, differenceInYears, differenceInMonths } from "date-fns";
import { useLanguage } from "@/components/LanguageProvider";
import { useAuth } from "@/hooks/useAuth";
import { PersonnelForm } from "@/components/PersonnelForm";
import { PersonnelDocumentForm } from "@/components/PersonnelDocumentForm";
import { PersonnelAdvanceForm } from "@/components/PersonnelAdvanceForm";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useToast } from "@/hooks/use-toast";
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

interface Personnel {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  emiratesId?: string;
  emiratesIdIssueDate?: string;
  emiratesIdExpiryDate?: string;
  specialization: string;
  startDate: string;
  salary?: string;
  status?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

interface PersonnelDocument {
  id: string;
  personnelId: string;
  documentType: string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  fileUrl?: string;
  uploadedAt: string;
  uploadedBy: string;
}

interface PersonnelAdvance {
  id: string;
  personnelId: string;
  amount: string;
  date: string;
  description?: string;
  fileUrl?: string;
  projectId?: string;
  status: string;
  createdBy: string;
  createdAt: string;
  cancelledBy?: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

export function PersonnelDetail() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, params] = useRoute("/personnel/:id");
  const [, setLocation] = useLocation();
  const personnelId = params?.id;
  
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDocForm, setShowDocForm] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<PersonnelDocument | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [showDocDeleteDialog, setShowDocDeleteDialog] = useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const [showAdvanceForm, setShowAdvanceForm] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showAdvanceDeleteDialog, setShowAdvanceDeleteDialog] = useState(false);
  const [advanceToDelete, setAdvanceToDelete] = useState<string | null>(null);

  // Handle Escape key to close modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedPhoto) {
          setSelectedPhoto(null);
        } else if (selectedDocument) {
          setSelectedDocument(null);
        }
      }
    };

    if (selectedPhoto || selectedDocument) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [selectedPhoto, selectedDocument]);
  
  const isAdmin = user?.role === 'admin';
  const canView = user?.role === 'admin' || user?.role === 'director';
  
  // Call all hooks before any conditional returns
  const { data: person, isLoading: isLoadingPerson } = useQuery<Personnel>({
    queryKey: [`/api/personnel/${personnelId}`],
    enabled: !!personnelId && canView,
  });
  
  const { data: documents = [], isLoading: isLoadingDocs } = useQuery<PersonnelDocument[]>({
    queryKey: [`/api/personnel/${personnelId}/documents`],
    enabled: !!personnelId && canView,
  });
  
  const { data: advances = [], isLoading: isLoadingAdvances } = useQuery<PersonnelAdvance[]>({
    queryKey: [`/api/personnel/${personnelId}/advances`],
    enabled: !!personnelId && canView,
  });
  
  const { data: advancesSummary } = useQuery<{
    totalAdvances: number;
    salary: number;
    toPay: number;
    carryOver: number;
  }>({
    queryKey: [`/api/personnel/${personnelId}/advances/summary`, selectedMonth.toISOString()],
    enabled: !!personnelId && canView,
  });
  
  // Delete person mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/personnel/${personnelId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Сотрудник удален",
      });
      setLocation("/personnel");
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete document mutation
  const deleteDocMutation = useMutation({
    mutationFn: async (docId: string) => {
      return await apiRequest(`/api/personnel/documents/${docId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Документ удален",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/personnel/${personnelId}/documents`] });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Cancel advance mutation
  const cancelAdvanceMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return await apiRequest(`/api/personnel/advances/${id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Аванс отменен",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/personnel/${personnelId}/advances`] });
      queryClient.invalidateQueries({ queryKey: [`/api/personnel/${personnelId}/advances/summary`] });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete advance mutation
  const deleteAdvanceMutation = useMutation({
    mutationFn: async (advanceId: string) => {
      return await apiRequest(`/api/personnel/advances/${advanceId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Аванс удален",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/personnel/${personnelId}/advances`] });
      queryClient.invalidateQueries({ queryKey: [`/api/personnel/${personnelId}/advances/summary`] });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Upload photo mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async (photoUrl: string) => {
      return await apiRequest(`/api/personnel/${personnelId}/photo`, {
        method: "POST",
        body: JSON.stringify({ photoUrl }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Фото загружено",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/personnel/${personnelId}`] });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Calculate work experience
  const calculateExperience = (startDate: string) => {
    const start = new Date(startDate);
    const now = new Date();
    const years = differenceInYears(now, start);
    const months = differenceInMonths(now, start) % 12;
    
    if (years > 0) {
      return `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'} ${months > 0 ? `${months} мес.` : ''}`;
    }
    return `${months} мес.`;
  };
  
  // Calculate age
  const calculateAge = (dateOfBirth: string) => {
    const birth = new Date(dateOfBirth);
    const now = new Date();
    const years = differenceInYears(now, birth);
    return `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'}`;
  };
  
  // Get document status
  const getDocumentStatus = (expiryDate?: string) => {
    if (!expiryDate) return 'normal';
    
    const now = new Date();
    const expiry = new Date(expiryDate);
    const days = differenceInDays(expiry, now);
    
    if (days <= 0) return 'expired';
    if (days <= 14) return 'critical';
    if (days <= 30) return 'warning';
    return 'normal';
  };
  
  // Get document type display name
  const getDocumentTypeName = (type: string) => {
    const types: Record<string, string> = {
      'emirates_id': 'Emirates ID',
      'passport': 'Паспорт',
      'visa': 'Виза',
      'contract': 'Трудовой договор',
      'medical': 'Медицинская карта',
      'insurance': 'Страховка',
      'qualification': 'Квалификация',
      'other': 'Другое'
    };
    return types[type] || type;
  };
  
  const handleDeletePerson = () => {
    deleteMutation.mutate();
    setShowDeleteDialog(false);
  };
  
  const handleDeleteDoc = () => {
    if (docToDelete) {
      deleteDocMutation.mutate(docToDelete);
      setShowDocDeleteDialog(false);
      setDocToDelete(null);
    }
  };
  
  const handleCancelAdvance = (advanceId: string) => {
    const reason = prompt("Укажите причину отмены аванса:");
    if (reason) {
      cancelAdvanceMutation.mutate({ id: advanceId, reason });
    }
  };

  const handleDeleteAdvance = () => {
    if (advanceToDelete) {
      deleteAdvanceMutation.mutate(advanceToDelete);
      setShowAdvanceDeleteDialog(false);
      setAdvanceToDelete(null);
    }
  };
  
  const handlePhotoUpload = async () => {
    try {
      // Get presigned URL
      console.log("Getting photo upload URL...");
      const response = await apiRequest("/api/objects/upload", {
        method: "POST",
      });
      const data = await response.json();
      console.log("Photo upload response data:", data);
      
      if (!data || !data.uploadURL) {
        console.error("Invalid response data:", data);
        throw new Error("No upload URL received from server");
      }
      
      const uploadURL = data.uploadURL;
      console.log("Extracted uploadURL:", uploadURL);
      
      return {
        method: "PUT" as const,
        url: uploadURL,
      };
    } catch (error) {
      console.error("Photo upload error:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось получить URL для загрузки",
        variant: "destructive",
      });
      throw error;
    }
  };
  
  const handlePhotoComplete = async (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const file = result.successful[0];
      const uploadURL = file.uploadURL;
      console.log("Photo complete - file data:", file);
      console.log("Photo complete - uploadURL:", uploadURL);
      
      try {
        await uploadPhotoMutation.mutateAsync(uploadURL);
        toast({
          title: "Успешно",
          description: "Фото загружено",
        });
      } catch (error) {
        console.error("Photo upload mutation error:", error);
        toast({
          title: "Ошибка",
          description: "Не удалось сохранить фото",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить фото",
        variant: "destructive",
      });
    }
  };
  
  // Check access after all hooks
  if (!canView) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Нет доступа к разделу "Персонал"</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (isLoadingPerson || isLoadingDocs) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }
  
  if (!person) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Сотрудник не найден</p>
            <div className="mt-4 text-center">
              <Link href="/personnel">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Вернуться к списку
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const experience = calculateExperience(person.startDate);
  const age = person.dateOfBirth ? calculateAge(person.dateOfBirth) : null;
  
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/personnel">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">
            {person.lastName} {person.firstName}
            {person.middleName && ` ${person.middleName}`}
          </h1>
        </div>
        
        {isAdmin && (
          <div className="flex gap-2">
            <Button onClick={() => setShowEditForm(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Редактировать
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Удалить
            </Button>
          </div>
        )}
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Photo and Basic Info */}
        <div className="space-y-4">
          {/* Photo Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center">
                <div className="relative group">
                  {person.photoUrl ? (
                    <div className="relative">
                      <img 
                        src={`/objects/${person.photoUrl.split('/').slice(-2).join('/')}`}
                        alt={`${person.lastName} ${person.firstName}`}
                        className="w-32 h-32 rounded-full object-cover mb-4 cursor-pointer"
                        onClick={() => setSelectedPhoto(person.photoUrl || null)}
                        onError={(e) => {
                          console.error("Photo load error for:", person.photoUrl);
                          // Hide image on error
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <div 
                        className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer mb-4"
                        onClick={() => setSelectedPhoto(person.photoUrl || null)}
                      >
                        <Plus className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center mb-4">
                      <User className="w-16 h-16 text-muted-foreground" />
                    </div>
                  )}
                </div>
                
                {isAdmin && (
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={5242880} // 5MB
                    onGetUploadParameters={handlePhotoUpload}
                    onComplete={handlePhotoComplete}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Загрузить фото
                  </ObjectUploader>
                )}
                
                <div className="text-center mt-4">
                  <p className="font-medium text-lg">{person.specialization}</p>
                  <Badge 
                    variant={person.status === 'active' ? 'default' : 
                            person.status === 'dismissed' ? 'destructive' : 'secondary'}
                    className="mt-2"
                  >
                    {person.status === 'active' ? 'Активен' :
                     person.status === 'dismissed' ? 'Уволен' :
                     person.status === 'vacation' ? 'Отпуск' : person.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Контактная информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {person.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{person.phone}</span>
                </div>
              )}
              {person.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{person.email}</span>
                </div>
              )}
              {age && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Возраст: {age}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Right Column - Detailed Info */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="info">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Информация</TabsTrigger>
              <TabsTrigger value="documents">
                Документы
                {documents.some(d => getDocumentStatus(d.expiryDate) !== 'normal') && (
                  <AlertTriangle className="w-3 h-3 ml-1 text-destructive" />
                )}
              </TabsTrigger>
              <TabsTrigger value="advances">
                Авансы
                <DollarSign className="w-3 h-3 ml-1" />
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="info" className="space-y-4">
              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Личные данные</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">ФИО</p>
                    <p className="font-medium">
                      {person.lastName} {person.firstName}
                      {person.middleName && ` ${person.middleName}`}
                    </p>
                  </div>
                  {person.dateOfBirth && (
                    <div>
                      <p className="text-sm text-muted-foreground">Дата рождения</p>
                      <p className="font-medium">
                        {format(new Date(person.dateOfBirth), 'dd.MM.yyyy')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Emirates ID */}
              {person.emiratesId && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Emirates ID</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Номер</p>
                      <p className="font-medium">{person.emiratesId}</p>
                    </div>
                    {person.emiratesIdIssueDate && (
                      <div>
                        <p className="text-sm text-muted-foreground">Дата выдачи</p>
                        <p className="font-medium">
                          {format(new Date(person.emiratesIdIssueDate), 'dd.MM.yyyy')}
                        </p>
                      </div>
                    )}
                    {person.emiratesIdExpiryDate && (
                      <div>
                        <p className="text-sm text-muted-foreground">Дата окончания</p>
                        <p className="font-medium">
                          {format(new Date(person.emiratesIdExpiryDate), 'dd.MM.yyyy')}
                        </p>
                        {getDocumentStatus(person.emiratesIdExpiryDate) !== 'normal' && (
                          <Badge 
                            variant={getDocumentStatus(person.emiratesIdExpiryDate) === 'expired' ? 'destructive' : 'default'}
                            className={getDocumentStatus(person.emiratesIdExpiryDate) === 'warning' ? 'bg-yellow-500' : ''}
                          >
                            {getDocumentStatus(person.emiratesIdExpiryDate) === 'expired' ? 'Истёк' :
                             getDocumentStatus(person.emiratesIdExpiryDate) === 'critical' ? '≤14 дней' : '≤30 дней'}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              
              {/* Work Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Рабочая информация</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Специализация</p>
                    <p className="font-medium">{person.specialization}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Дата начала работы</p>
                    <p className="font-medium">
                      {format(new Date(person.startDate), 'dd.MM.yyyy')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Стаж работы</p>
                    <p className="font-medium">{experience}</p>
                  </div>
                  {person.salary && (
                    <div>
                      <p className="text-sm text-muted-foreground">Зарплата</p>
                      <p className="font-medium">
                        AED {parseFloat(person.salary).toLocaleString()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="documents" className="space-y-4">
              {/* Documents Header */}
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Документы сотрудника</h3>
                {isAdmin && (
                  <Button onClick={() => setShowDocForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить документ
                  </Button>
                )}
              </div>
              
              {/* Documents List */}
              {documents.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {documents.map(doc => {
                    const status = getDocumentStatus(doc.expiryDate);
                    
                    return (
                      <Card key={doc.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <FileText className="w-5 h-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{getDocumentTypeName(doc.documentType)}</p>
                                {doc.documentNumber && (
                                  <p className="text-sm text-muted-foreground">№ {doc.documentNumber}</p>
                                )}
                                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                  {doc.issueDate && (
                                    <span>Выдан: {format(new Date(doc.issueDate), 'dd.MM.yyyy')}</span>
                                  )}
                                  {doc.expiryDate && (
                                    <span>Истекает: {format(new Date(doc.expiryDate), 'dd.MM.yyyy')}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {status !== 'normal' && (
                                <Badge 
                                  variant={status === 'expired' ? 'destructive' : 'default'}
                                  className={status === 'warning' ? 'bg-yellow-500' : ''}
                                >
                                  {status === 'expired' ? 'Истёк' :
                                   status === 'critical' ? '≤14 дней' : '≤30 дней'}
                                </Badge>
                              )}
                              
                              {doc.fileUrl && (
                                <>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => setSelectedDocument(doc.fileUrl || null)}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <a 
                                    href={`/objects/${doc.fileUrl.split('/').slice(-2).join('/')}`}
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                  >
                                    <Button variant="ghost" size="sm">
                                      <Download className="w-4 h-4" />
                                    </Button>
                                  </a>
                                </>
                              )}
                              
                              {isAdmin && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedDoc(doc);
                                      setShowDocForm(true);
                                    }}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setDocToDelete(doc.id);
                                      setShowDocDeleteDialog(true);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">Документы не добавлены</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="advances" className="space-y-4">
              {/* Advances Summary */}
              {advancesSummary && person.salary && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Расчет зарплаты</CardTitle>
                      <div className="flex items-center gap-2">
                        <input
                          type="month"
                          value={selectedMonth.toISOString().slice(0, 7)}
                          onChange={(e) => setSelectedMonth(new Date(e.target.value))}
                          className="px-2 py-1 border rounded"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Зарплата</p>
                        <p className="text-lg font-medium">{advancesSummary.salary.toFixed(2)} AED</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Взято авансов</p>
                        <p className="text-lg font-medium text-red-600">
                          {advancesSummary.totalAdvances.toFixed(2)} AED
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Долг с прошлого месяца</p>
                        <p className="text-lg font-medium text-orange-600">
                          {advancesSummary.carryOver.toFixed(2)} AED
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">К выплате</p>
                        <p className="text-lg font-medium text-green-600">
                          {advancesSummary.toPay.toFixed(2)} AED
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Add Advance Button */}
              {(isAdmin || user?.role === 'director') && (
                <div className="flex justify-end">
                  <Button onClick={() => setShowAdvanceForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить аванс
                  </Button>
                </div>
              )}
              
              {/* Advances List */}
              {isLoadingAdvances ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">Загрузка...</p>
                  </CardContent>
                </Card>
              ) : advances.length > 0 ? (
                <div className="space-y-2">
                  {advances.map((advance) => (
                    <Card key={advance.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-lg">
                                {parseFloat(advance.amount).toFixed(2)} AED
                              </p>
                              {advance.status === 'cancelled' && (
                                <Badge variant="destructive">Отменен</Badge>
                              )}
                            </div>
                            
                            <p className="text-sm text-muted-foreground mt-1">
                              {format(new Date(advance.date), 'dd.MM.yyyy')}
                            </p>
                            
                            {advance.description && (
                              <p className="text-sm mt-2">{advance.description}</p>
                            )}
                            
                            {advance.cancellationReason && (
                              <p className="text-sm text-red-600 mt-2">
                                Причина отмены: {advance.cancellationReason}
                              </p>
                            )}
                            
                            {advance.fileUrl && (
                              <a 
                                href={`/objects/${advance.fileUrl.split('/').slice(-2).join('/')}`}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-2"
                              >
                                <FileText className="w-3 h-3" />
                                Документ
                              </a>
                            )}
                          </div>
                          
                          {isAdmin && advance.status === 'active' && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancelAdvance(advance.id)}
                                className="text-orange-600 hover:text-orange-700"
                                title="Отменить аванс"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setAdvanceToDelete(advance.id);
                                  setShowAdvanceDeleteDialog(true);
                                }}
                                className="text-red-600 hover:text-red-700"
                                title="Удалить аванс"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">Авансы не найдены</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Forms and Dialogs */}
      {showEditForm && (
        <PersonnelForm
          person={person}
          open={showEditForm}
          onClose={() => setShowEditForm(false)}
          onSuccess={() => {
            setShowEditForm(false);
            queryClient.invalidateQueries({ queryKey: [`/api/personnel/${personnelId}`] });
          }}
        />
      )}
      
      {showDocForm && (
        <PersonnelDocumentForm
          personnelId={personnelId!}
          document={selectedDoc}
          open={showDocForm}
          onClose={() => {
            setShowDocForm(false);
            setSelectedDoc(null);
          }}
          onSuccess={() => {
            setShowDocForm(false);
            setSelectedDoc(null);
            queryClient.invalidateQueries({ queryKey: [`/api/personnel/${personnelId}/documents`] });
          }}
        />
      )}
      
      {showAdvanceForm && (
        <PersonnelAdvanceForm
          personnelId={personnelId!}
          open={showAdvanceForm}
          onClose={() => setShowAdvanceForm(false)}
          onSuccess={() => {
            setShowAdvanceForm(false);
            queryClient.invalidateQueries({ queryKey: [`/api/personnel/${personnelId}/advances`] });
            queryClient.invalidateQueries({ queryKey: [`/api/personnel/${personnelId}/advances/summary`] });
          }}
        />
      )}
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить сотрудника?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие необратимо. Сотрудник и все его документы будут удалены.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePerson}>
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={showDocDeleteDialog} onOpenChange={setShowDocDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить документ?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие необратимо. Документ будет удален.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDoc}>
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={showAdvanceDeleteDialog} onOpenChange={setShowAdvanceDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить аванс?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие необратимо. Аванс будет полностью удален из системы.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAdvance}>
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Photo Viewer Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <Button
              className="absolute top-4 right-4 bg-black bg-opacity-50 hover:bg-opacity-75 z-10"
              variant="ghost"
              size="icon"
              onClick={() => setSelectedPhoto(null)}
            >
              <X className="w-6 h-6 text-white" />
            </Button>
            <img
              src={`/objects/${selectedPhoto.split('/').slice(-2).join('/')}`}
              alt="Фото сотрудника"
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                console.error("Full photo load error for:", selectedPhoto);
                toast({
                  title: "Ошибка",
                  description: "Не удалось загрузить фото",
                  variant: "destructive",
                });
                setSelectedPhoto(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {selectedDocument && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedDocument(null)}
        >
          <div className="relative w-full h-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
            <Button
              className="absolute top-2 right-2 bg-black bg-opacity-50 hover:bg-opacity-75 z-10"
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDocument(null)}
            >
              <X className="w-6 h-6 text-white" />
            </Button>
            <iframe
              src={`/objects/${selectedDocument.split('/').slice(-2).join('/')}`}
              className="w-full h-full border-none rounded"
              title="Документ"
              onError={() => {
                console.error("Document load error for:", selectedDocument);
                toast({
                  title: "Ошибка",
                  description: "Не удалось загрузить документ",
                  variant: "destructive",
                });
                setSelectedDocument(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}