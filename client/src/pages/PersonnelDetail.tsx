import { useState } from "react";
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
  Upload, DollarSign, MapPin
} from "lucide-react";
import { format, differenceInDays, differenceInYears, differenceInMonths } from "date-fns";
import { useLanguage } from "@/components/LanguageProvider";
import { useAuth } from "@/hooks/useAuth";
import { PersonnelForm } from "@/components/PersonnelForm";
import { PersonnelDocumentForm } from "@/components/PersonnelDocumentForm";
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
  const [showDocDeleteDialog, setShowDocDeleteDialog] = useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  
  const isAdmin = user?.role === 'admin';
  const canView = user?.role === 'admin' || user?.role === 'director';
  
  // Check access
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
  
  const { data: person, isLoading: isLoadingPerson } = useQuery<Personnel>({
    queryKey: [`/api/personnel/${personnelId}`],
    enabled: !!personnelId && canView,
  });
  
  const { data: documents = [], isLoading: isLoadingDocs } = useQuery<PersonnelDocument[]>({
    queryKey: [`/api/personnel/${personnelId}/documents`],
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
  
  const handlePhotoUpload = async () => {
    // Get presigned URL
    const response = await apiRequest("/api/objects/upload", {
      method: "POST",
    });
    return {
      method: "PUT" as const,
      url: response.uploadURL,
    };
  };
  
  const handlePhotoComplete = async (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      await uploadPhotoMutation.mutateAsync(uploadURL);
    }
  };
  
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
                {person.photoUrl ? (
                  <img 
                    src={person.photoUrl} 
                    alt={`${person.lastName} ${person.firstName}`}
                    className="w-32 h-32 rounded-full object-cover mb-4"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center mb-4">
                    <User className="w-16 h-16 text-muted-foreground" />
                  </div>
                )}
                
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">Информация</TabsTrigger>
              <TabsTrigger value="documents">
                Документы
                {documents.some(d => getDocumentStatus(d.expiryDate) !== 'normal') && (
                  <AlertTriangle className="w-3 h-3 ml-1 text-destructive" />
                )}
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
                                <a 
                                  href={doc.fileUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  <Button variant="ghost" size="sm">
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </a>
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
    </div>
  );
}