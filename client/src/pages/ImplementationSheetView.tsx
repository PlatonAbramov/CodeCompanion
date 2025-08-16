import { useState } from "react";
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
  Eye, EyeOff, CheckCircle, Circle, Image as ImageIcon 
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { ObjectUploader } from "@/components/ObjectUploader";
import { ObjectStorageService } from "@/lib/objectStorage";

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
    const uploadURL = await objectStorageService.getUploadURL();
    return {
      method: 'PUT' as const,
      url: uploadURL,
    };
  };

  const handleUploadComplete = async (result: any) => {
    if (result.successful?.[0] && uploadingItemId) {
      const uploadedFile = result.successful[0];
      const photoUrl = await objectStorageService.setObjectAclPolicy(uploadedFile.uploadURL, {
        visibility: 'public'
      });
      
      await createPhotoMutation.mutateAsync({
        itemId: uploadingItemId,
        photoUrl,
        visibleToClient: false
      });
      
      setUploadingItemId(null);
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

      <div className="space-y-4">
        {sheet.items?.map((item) => (
          <Card key={item.id} className={item.isCompleted ? 'opacity-75' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleComplete(item)}
                      data-testid={`button-toggle-${item.id}`}
                    >
                      {item.isCompleted ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </Button>
                    <span className={item.isCompleted ? 'line-through' : ''}>
                      {item.position}. {item.name}
                    </span>
                  </CardTitle>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mt-2">{item.description}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {isAdminOrDirector && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleVisibility(item)}
                      data-testid={`button-visibility-${item.id}`}
                    >
                      {item.visibleToClient ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  {item.quantity && item.unit && (
                    <p className="text-sm">
                      {language === 'ru' ? 'Количество: ' : 'Quantity: '}
                      <span className="font-medium">{item.quantity} {item.unit}</span>
                    </p>
                  )}
                  {item.totalCost && (
                    <p className="text-sm">
                      {language === 'ru' ? 'Стоимость: ' : 'Cost: '}
                      <span className="font-medium">₽{item.totalCost}</span>
                    </p>
                  )}
                </div>
                
                <div>
                  {isEditMode === item.id ? (
                    <div className="space-y-2">
                      <Label>{language === 'ru' ? 'Прогресс' : 'Progress'}: {editProgress}%</Label>
                      <Slider
                        value={[editProgress]}
                        onValueChange={([value]) => setEditProgress(value)}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            handleProgressUpdate(item.id, editProgress);
                          }}
                          data-testid={`button-save-progress-${item.id}`}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          {language === 'ru' ? 'Сохранить' : 'Save'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsEditMode(null)}
                          data-testid={`button-cancel-progress-${item.id}`}
                        >
                          <X className="h-4 w-4 mr-1" />
                          {language === 'ru' ? 'Отмена' : 'Cancel'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {language === 'ru' ? 'Прогресс' : 'Progress'}
                        </span>
                        <span className="text-sm font-semibold">{item.progress}%</span>
                      </div>
                      <Progress value={item.progress} className="h-2" />
                      {(isAdminOrDirector || user?.id === item.lastUpdatedBy) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIsEditMode(item.id);
                            setEditProgress(item.progress);
                          }}
                          data-testid={`button-edit-progress-${item.id}`}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          {language === 'ru' ? 'Изменить' : 'Edit'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedItem(item)}
                  data-testid={`button-view-photos-${item.id}`}
                >
                  <ImageIcon className="h-4 w-4 mr-1" />
                  {language === 'ru' ? 'Фотографии' : 'Photos'}
                </Button>
                
                {uploadingItemId === item.id ? (
                  <ObjectUploader
                    maxNumberOfFiles={5}
                    maxFileSize={10485760}
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={handleUploadComplete}
                  >
                    <Camera className="h-4 w-4 mr-1" />
                    {language === 'ru' ? 'Загрузить фото' : 'Upload Photo'}
                  </ObjectUploader>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePhotoUpload(item.id)}
                    data-testid={`button-upload-photo-${item.id}`}
                  >
                    <Camera className="h-4 w-4 mr-1" />
                    {language === 'ru' ? 'Добавить фото' : 'Add Photo'}
                  </Button>
                )}
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
          
          <div className="grid gap-4 md:grid-cols-2">
            {itemPhotos?.map((photo) => (
              <div key={photo.id} className="relative group">
                <img
                  src={photo.photoUrl}
                  alt={photo.caption || ''}
                  className="w-full h-48 object-cover rounded-lg cursor-pointer"
                  onClick={() => setSelectedPhoto(photo)}
                />
                {photo.caption && (
                  <p className="text-sm text-muted-foreground mt-1">{photo.caption}</p>
                )}
                {isAdminOrDirector && (
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deletePhotoMutation.mutate(photo.id)}
                    data-testid={`button-delete-photo-${photo.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Badge 
                  className="absolute bottom-2 left-2"
                  variant={photo.visibleToClient ? 'default' : 'secondary'}
                >
                  {photo.visibleToClient ? (
                    <Eye className="h-3 w-3 mr-1" />
                  ) : (
                    <EyeOff className="h-3 w-3 mr-1" />
                  )}
                  {language === 'ru' ? 'Клиент' : 'Client'}
                </Badge>
              </div>
            ))}
          </div>
          
          {itemPhotos?.length === 0 && (
            <div className="text-center py-8">
              <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {language === 'ru' ? 'Нет фотографий' : 'No photos'}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Full size photo viewer */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          {selectedPhoto && (
            <img
              src={selectedPhoto.photoUrl}
              alt={selectedPhoto.caption || ''}
              className="w-full h-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}