import { useState, useMemo, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, Plus, Camera, Trash2, Edit, Save, X, 
  Eye, EyeOff, CheckCircle, Circle, Image as ImageIcon,
  ChevronLeft, ChevronRight, MessageSquare
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { ObjectUploader } from "@/components/ObjectUploader";
import { ObjectStorageService } from "@/lib/objectStorage";
import { PhotoViewer } from "@/components/PhotoViewer";
import { ImplementationItemComments } from "@/components/ImplementationItemComments";

interface ImplementationItem {
  id: string;
  sheetId: string;
  position: number;
  name: string;
  quantity?: number;
  unit?: string;
  price?: number;
  totalCost?: number;
  description?: string;
  progress: number;
  isCompleted: boolean;
  visibleToClient: boolean;
  lastUpdatedBy?: string;
  lastUpdatedAt: string;
  createdAt: string;
}

interface ImplementationPhoto {
  id: string;
  itemId: string;
  photoUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  visibleToClient: boolean;
  uploadedBy?: string;
  uploadedAt: string;
}

interface ImplementationSheet {
  id: string;
  projectId: string;
  name: string;
  status: string;
  totalProgress: string;
  items: ImplementationItem[];
}

export default function ImplementationSheetView() {
  const { sheetId } = useParams<{ sheetId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [selectedItem, setSelectedItem] = useState<ImplementationItem | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<ImplementationPhoto | null>(null);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState<string | null>(null);
  const [editProgress, setEditProgress] = useState(0);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState<number>(0);
  const [selectedItemForComments, setSelectedItemForComments] = useState<ImplementationItem | null>(null);
  
  const isAdminOrDirector = user?.role === 'admin' || user?.role === 'director';
  const objectStorageService = new ObjectStorageService();

  const { data: sheet, isLoading } = useQuery<ImplementationSheet>({
    queryKey: [`/api/implementation-sheets/${sheetId}`],
    enabled: !!sheetId
  });

  const { data: itemPhotos } = useQuery<ImplementationPhoto[]>({
    queryKey: [`/api/implementation-items/${selectedItem?.id}/photos`],
    enabled: !!selectedItem?.id
  });

  // Сортируем фотографии по времени загрузки (новые в конце)
  const sortedPhotos = useMemo(() => {
    if (!itemPhotos) return [];
    return [...itemPhotos].sort((a, b) => 
      new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
    );
  }, [itemPhotos]);

  // Обновляем индекс когда выбираем фото
  useEffect(() => {
    if (selectedPhoto && sortedPhotos.length > 0) {
      const index = sortedPhotos.findIndex(photo => photo.id === selectedPhoto.id);
      if (index !== -1) {
        setCurrentPhotoIndex(index);
      }
    }
  }, [selectedPhoto, sortedPhotos]);

  // Функции навигации по фотографиям
  const navigateToPhoto = (direction: 'prev' | 'next') => {
    if (sortedPhotos.length === 0) return;
    
    let newIndex = currentPhotoIndex;
    if (direction === 'prev') {
      newIndex = currentPhotoIndex > 0 ? currentPhotoIndex - 1 : sortedPhotos.length - 1;
    } else {
      newIndex = currentPhotoIndex < sortedPhotos.length - 1 ? currentPhotoIndex + 1 : 0;
    }
    
    setCurrentPhotoIndex(newIndex);
    setSelectedPhoto(sortedPhotos[newIndex]);
  };

  // Обработка клавиш навигации
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedPhoto) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          navigateToPhoto('prev');
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          navigateToPhoto('next');
        } else if (e.key === 'Escape') {
          setSelectedPhoto(null);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhoto, currentPhotoIndex, sortedPhotos]);

  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: Partial<ImplementationItem> }) => {
      return apiRequest(`/api/implementation-items/${itemId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/implementation-sheets/${sheetId}`] });
      toast({
        title: language === 'ru' ? "Позиция обновлена" : "Item updated",
      });
      setIsEditMode(null);
    },
    onError: () => {
      toast({
        title: language === 'ru' ? "Ошибка" : "Error",
        description: language === 'ru' ? "Не удалось обновить позицию" : "Failed to update item",
        variant: "destructive",
      });
    },
  });

  const createPhotoMutation = useMutation({
    mutationFn: async ({ itemId, photoUrl, caption, visibleToClient }: {
      itemId: string;
      photoUrl: string;
      caption?: string;
      visibleToClient: boolean;
    }) => {
      return apiRequest(`/api/implementation-items/${itemId}/photos`, {
        method: "POST",
        body: JSON.stringify({ photoUrl, caption, visibleToClient }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/implementation-items/${selectedItem?.id}/photos`] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-client-projects"] }); // Для клиентов
      toast({
        title: language === 'ru' ? "Фото добавлено" : "Photo added",
      });
    },
    onError: () => {
      toast({
        title: language === 'ru' ? "Ошибка" : "Error",
        description: language === 'ru' ? "Не удалось добавить фото" : "Failed to add photo",
        variant: "destructive",
      });
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: string) => {
      return apiRequest(`/api/implementation-photos/${photoId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/implementation-items/${selectedItem?.id}/photos`] });
      toast({
        title: language === 'ru' ? "Фото удалено" : "Photo deleted",
      });
    },
    onError: () => {
      toast({
        title: language === 'ru' ? "Ошибка" : "Error",
        description: language === 'ru' ? "Не удалось удалить фото" : "Failed to delete photo",
        variant: "destructive",
      });
    },
  });

  const handleProgressUpdate = (itemId: string, progress: number) => {
    updateItemMutation.mutate({
      itemId,
      data: { progress, isCompleted: progress === 100 }
    });
  };

  const handleToggleComplete = (item: ImplementationItem) => {
    updateItemMutation.mutate({
      itemId: item.id,
      data: { isCompleted: !item.isCompleted, progress: item.isCompleted ? 0 : 100 }
    });
  };

  const handleToggleVisibility = (item: ImplementationItem) => {
    updateItemMutation.mutate({
      itemId: item.id,
      data: { visibleToClient: !item.visibleToClient }
    });
  };

  const handlePhotoUpload = async (itemId: string) => {
    setUploadingItemId(itemId);
  };

  const handleGetUploadParameters = async () => {
    try {
      const uploadURL = await objectStorageService.getUploadURL();
      console.log('Got upload URL:', uploadURL);
      return {
        method: 'PUT' as const,
        url: uploadURL,
      };
    } catch (error) {
      console.error('Error getting upload parameters:', error);
      toast({
        title: language === 'ru' ? "Ошибка" : "Error",
        description: language === 'ru' ? "Не удалось получить URL для загрузки" : "Failed to get upload URL",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleUploadComplete = async (result: any) => {
    console.log('Upload complete result:', result);
    if (result.successful?.length > 0 && uploadingItemId) {
      try {
        // Обрабатываем все успешно загруженные файлы
        for (const uploadedFile of result.successful) {
          console.log('Uploaded file URL:', uploadedFile.uploadURL);
          
          const photoUrl = await objectStorageService.setObjectAclPolicy(uploadedFile.uploadURL, {
            visibility: 'public'
          });
          
          console.log('Normalized photo URL:', photoUrl);
          
          await createPhotoMutation.mutateAsync({
            itemId: uploadingItemId,
            photoUrl,
            visibleToClient: false
          });
          
          console.log('File saved to database:', photoUrl);
        }
        
        toast({
          title: language === 'ru' ? "Успешно" : "Success",
          description: language === 'ru' 
            ? `Загружено ${result.successful.length} файлов` 
            : `Uploaded ${result.successful.length} files`,
        });
        
        setUploadingItemId(null);
      } catch (error) {
        console.error('Error saving files:', error);
        toast({
          title: language === 'ru' ? "Ошибка" : "Error",
          description: language === 'ru' ? "Не удалось сохранить файлы" : "Failed to save files",
          variant: "destructive",
        });
        setUploadingItemId(null);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">
            {language === 'ru' ? 'Загрузка...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-muted-foreground">
          {language === 'ru' ? 'Лист не найден' : 'Sheet not found'}
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href={`/projects/${sheet.projectId}/implementation-sheets`}>
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">{sheet.name}</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {language === 'ru' ? 'Общий прогресс' : 'Total Progress'}
              </span>
              <span className="text-sm font-semibold">
                {parseFloat(sheet.totalProgress || "0").toFixed(0)}%
              </span>
            </div>
            <Progress value={parseFloat(sheet.totalProgress || "0")} className="h-3" />
          </div>
          <Badge variant={sheet.status === 'active' ? 'default' : 'secondary'}>
            {sheet.status === 'active' 
              ? (language === 'ru' ? 'Активный' : 'Active')
              : (language === 'ru' ? 'Завершен' : 'Completed')}
          </Badge>
        </div>
      </div>

      <div className="space-y-3">
        {sheet.items?.map((item) => (
          <Card key={item.id} className={`${item.isCompleted ? 'opacity-75' : ''} overflow-hidden`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {/* Статус завершения */}
                {isAdminOrDirector ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 h-8 w-8"
                    onClick={() => handleToggleComplete(item)}
                    data-testid={`button-toggle-${item.id}`}
                  >
                    {item.isCompleted ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </Button>
                ) : (
                  <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center">
                    {item.isCompleted ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  {/* Название и стоимость в одной строке */}
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`font-medium text-sm leading-tight ${item.isCompleted ? 'line-through' : ''}`}>
                      {item.position}. {item.name}
                      {item.totalCost && (
                        <span className="ml-2 text-blue-600 font-semibold">
                          — {item.totalCost.toLocaleString()} AED
                        </span>
                      )}
                    </h3>
                    
                    {/* Кнопки управления */}
                    <div className="flex items-center gap-1">
                      {isAdminOrDirector && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleToggleVisibility(item)}
                          data-testid={`button-visibility-${item.id}`}
                        >
                          {item.visibleToClient ? (
                            <Eye className="h-3 w-3" />
                          ) : (
                            <EyeOff className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Прогресс */}
                  <div className="mb-3">
                    {isEditMode === item.id ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">{language === 'ru' ? 'Прогресс' : 'Progress'}</Label>
                          <span className="text-xs font-semibold">{editProgress}%</span>
                        </div>
                        <Slider
                          value={[editProgress]}
                          onValueChange={([value]) => setEditProgress(value)}
                          max={100}
                          step={5}
                          className="w-full"
                        />
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => handleProgressUpdate(item.id, editProgress)}
                            data-testid={`button-save-progress-${item.id}`}
                          >
                            <Save className="h-3 w-3 mr-1" />
                            {language === 'ru' ? 'Сохранить' : 'Save'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs px-2"
                            onClick={() => setIsEditMode(null)}
                            data-testid={`button-cancel-progress-${item.id}`}
                          >
                            <X className="h-3 w-3 mr-1" />
                            {language === 'ru' ? 'Отмена' : 'Cancel'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {language === 'ru' ? 'Прогресс' : 'Progress'}
                          </span>
                          <span className="text-xs font-semibold">{item.progress}%</span>
                        </div>
                        <Progress value={item.progress} className="h-2" />
                      </div>
                    )}
                  </div>

                  {/* Кнопки действий */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {!isEditMode && (isAdminOrDirector || user?.id === item.lastUpdatedBy) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs px-2"
                        onClick={() => {
                          setIsEditMode(item.id);
                          setEditProgress(item.progress);
                        }}
                        data-testid={`button-edit-progress-${item.id}`}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        {language === 'ru' ? 'Изменить' : 'Edit'}
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs px-2"
                      onClick={() => setSelectedItem(item)}
                      data-testid={`button-view-photos-${item.id}`}
                    >
                      <ImageIcon className="h-3 w-3 mr-1" />
                      {language === 'ru' ? 'Фото' : 'Photos'}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs px-2"
                      onClick={() => setSelectedItemForComments(item)}
                      data-testid={`button-view-comments-${item.id}`}
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      {language === 'ru' ? 'Комментарии' : 'Comments'}
                    </Button>
                    
                    {/* Функция добавления фото только для админов и директоров */}
                    {isAdminOrDirector && (
                      uploadingItemId === item.id ? (
                        <ObjectUploader
                          maxNumberOfFiles={10}
                          maxFileSize={100 * 1024 * 1024} // 100MB
                          allowedFileTypes={['image/*', 'video/*']}
                          onGetUploadParameters={handleGetUploadParameters}
                          onComplete={handleUploadComplete}
                        >
                          <Camera className="h-3 w-3 mr-1" />
                          📷🎥
                        </ObjectUploader>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-xs px-2"
                          onClick={() => handlePhotoUpload(item.id)}
                          data-testid={`button-upload-photo-${item.id}`}
                        >
                          <Camera className="h-3 w-3 mr-1" />
                          {language === 'ru' ? 'Добавить' : 'Add'}
                        </Button>
                      )
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Photo viewer dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {language === 'ru' ? 'Фотографии позиции' : 'Item Photos'}: {selectedItem?.name}
            </DialogTitle>
          </DialogHeader>
          
          {/* Компактное отображение фотографий в одну строку - сортированные по времени */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {sortedPhotos?.map((photo, index) => (
              <div key={photo.id} className="relative group flex-shrink-0">
                <img
                  src={photo.photoUrl}
                  alt={photo.caption || ''}
                  className={`w-24 h-24 object-cover rounded-lg cursor-pointer border-2 transition-all ${
                    selectedPhoto?.id === photo.id ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                  }`}
                  onClick={() => {
                    setSelectedPhoto(photo);
                    setCurrentPhotoIndex(index);
                  }}
                />
                {isAdminOrDirector && (
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePhotoMutation.mutate(photo.id);
                    }}
                    data-testid={`button-delete-photo-${photo.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
                <Badge 
                  className="absolute bottom-1 left-1 text-xs px-1 py-0"
                  variant={photo.visibleToClient ? 'default' : 'secondary'}
                >
                  {photo.visibleToClient ? (
                    <Eye className="h-2 w-2" />
                  ) : (
                    <EyeOff className="h-2 w-2" />
                  )}
                </Badge>
                {/* Номер фотографии */}
                <Badge 
                  className="absolute top-1 left-1 text-xs px-1 py-0 bg-black/50 text-white border-none"
                >
                  {index + 1}
                </Badge>
              </div>
            ))}
          </div>

          {/* Если больше 6 фотографий, показываем в сетке */}
          {(sortedPhotos?.length || 0) > 6 && (
            <div className="grid gap-4 md:grid-cols-3 mt-4">
              {sortedPhotos?.map((photo, index) => (
                <div key={photo.id} className="relative group">
                  <img
                    src={photo.photoUrl}
                    alt={photo.caption || ''}
                    className={`w-full h-32 object-cover rounded-lg cursor-pointer border-2 transition-all ${
                      selectedPhoto?.id === photo.id ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                    }`}
                    onClick={() => {
                      setSelectedPhoto(photo);
                      setCurrentPhotoIndex(index);
                    }}
                  />
                  {photo.caption && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{photo.caption}</p>
                  )}
                  {isAdminOrDirector && (
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePhotoMutation.mutate(photo.id);
                      }}
                      data-testid={`button-delete-photo-${photo.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                  <Badge 
                    className="absolute bottom-1 left-1 text-xs px-1 py-0"
                    variant={photo.visibleToClient ? 'default' : 'secondary'}
                  >
                    {photo.visibleToClient ? (
                      <Eye className="h-2 w-2" />
                    ) : (
                      <EyeOff className="h-2 w-2" />
                    )}
                  </Badge>
                  {/* Номер фотографии */}
                  <Badge 
                    className="absolute top-1 left-1 text-xs px-1 py-0 bg-black/50 text-white border-none"
                  >
                    {index + 1}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          
          {sortedPhotos?.length === 0 && (
            <div className="text-center py-8">
              <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {language === 'ru' ? 'Нет фотографий' : 'No photos'}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Full size photo viewer with navigation and zoom */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
          {selectedPhoto && sortedPhotos.length > 0 && (
            <PhotoViewer 
              photo={selectedPhoto}
              photos={sortedPhotos}
              currentIndex={currentPhotoIndex}
              onNavigate={navigateToPhoto}
              onClose={() => setSelectedPhoto(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Comments dialog */}
      <Dialog open={!!selectedItemForComments} onOpenChange={() => setSelectedItemForComments(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {language === 'ru' ? 'Комментарии' : 'Comments'}: {selectedItemForComments?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedItemForComments && sheet && (
            <ImplementationItemComments 
              itemId={selectedItemForComments.id}
              projectId={sheet.projectId}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}