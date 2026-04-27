import { useState, useMemo, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { DetailSkeleton } from "@/components/skeletons";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Plus, Camera, Trash2, Edit, Save, X,
  Eye, EyeOff, CheckCircle, Circle, Image as ImageIcon,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { ObjectUploader } from "@/components/ObjectUploader";
import { ObjectStorageService } from "@/lib/objectStorage";
import { PhotoViewer } from "@/components/PhotoViewer";
import { ImplementationItemComments } from "@/components/ImplementationItemComments";
import { CorpHeader, MoneyAED } from "@/components/corp-ui";

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

const ITEM_CARD_STYLE: React.CSSProperties = {
  background: 'var(--corp-surface)',
  border: '1px solid var(--corp-line)',
  borderRadius: 'var(--corp-r-lg)',
};

function ProgressBar({ value, height = 6 }: { value: number; height?: number }) {
  const v = Math.max(0, Math.min(100, value));
  const color =
    v >= 100 ? 'var(--corp-pos)' :
    v >= 50 ? 'var(--corp-accent)' :
    v > 0 ? 'var(--corp-warn, #f59e0b)' :
    'var(--corp-ink-3)';
  return (
    <div className="w-full overflow-hidden" style={{ height, background: 'var(--corp-surface-2)', borderRadius: height }}>
      <div
        style={{
          width: `${v}%`,
          height: '100%',
          background: color,
          transition: 'width 0.25s ease',
        }}
      />
    </div>
  );
}

function StatusPill({ active, labelOn, labelOff }: { active: boolean; labelOn: string; labelOff: string }) {
  return (
    <span
      className="inline-flex items-center px-2 h-5 text-[10px] font-bold uppercase"
      style={{
        background: active ? 'rgba(22,163,74,0.10)' : 'var(--corp-surface-2)',
        color: active ? 'var(--corp-pos)' : 'var(--corp-ink-3)',
        borderRadius: 'var(--corp-r-sm)',
        letterSpacing: '0.04em',
      }}
    >
      {active ? labelOn : labelOff}
    </span>
  );
}

export default function ImplementationSheetView() {
  const { sheetId } = useParams<{ sheetId: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [selectedItem, setSelectedItem] = useState<ImplementationItem | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<ImplementationPhoto | null>(null);
  const [isEditMode, setIsEditMode] = useState<string | null>(null);
  const [editProgress, setEditProgress] = useState(0);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState<number>(0);
  const [selectedItemForComments, setSelectedItemForComments] = useState<ImplementationItem | null>(null);

  const isAdminOrDirector = user?.role === 'admin' || user?.role === 'director';
  const canManageItems = user?.role === 'admin' || user?.role === 'director' || user?.role === 'master';
  const isClient = user?.role === 'client';
  const isWorker = user?.role === 'worker';
  // Рабочий может загружать фото и удалять только свои.
  const canManagePhotos = canManageItems || isClient || isWorker;

  const canDeletePhoto = (photo: ImplementationPhoto) => {
    if (canManageItems) return true;
    if ((isClient || isWorker) && photo.uploadedBy === user?.id) return true;
    return false;
  };
  const objectStorageService = new ObjectStorageService();

  const { data: sheet, isLoading } = useQuery<ImplementationSheet>({
    queryKey: [`/api/implementation-sheets/${sheetId}`],
    enabled: !!sheetId,
  });

  const { data: itemPhotos } = useQuery<ImplementationPhoto[]>({
    queryKey: [`/api/implementation-items/${selectedItem?.id}/photos`],
    enabled: !!selectedItem?.id,
  });

  const sortedPhotos = useMemo(() => {
    if (!itemPhotos) return [];
    return [...itemPhotos].sort((a, b) =>
      new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
    );
  }, [itemPhotos]);

  useEffect(() => {
    if (selectedPhoto && sortedPhotos.length > 0) {
      const index = sortedPhotos.findIndex(photo => photo.id === selectedPhoto.id);
      if (index !== -1) setCurrentPhotoIndex(index);
    }
  }, [selectedPhoto, sortedPhotos]);

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
      toast({ title: language === 'ru' ? "Позиция обновлена" : "Item updated" });
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
      queryClient.invalidateQueries({ queryKey: ["/api/my-client-projects"] });
      toast({ title: language === 'ru' ? "Фото добавлено" : "Photo added" });
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
      return apiRequest(`/api/implementation-photos/${photoId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/implementation-items/${selectedItem?.id}/photos`] });
      toast({ title: language === 'ru' ? "Фото удалено" : "Photo deleted" });
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
      data: { progress, isCompleted: progress === 100 },
    });
  };

  const handleToggleComplete = (item: ImplementationItem) => {
    updateItemMutation.mutate({
      itemId: item.id,
      data: { isCompleted: !item.isCompleted, progress: item.isCompleted ? 0 : 100 },
    });
  };

  const handleToggleVisibility = (item: ImplementationItem) => {
    updateItemMutation.mutate({
      itemId: item.id,
      data: { visibleToClient: !item.visibleToClient },
    });
  };

  const handlePhotoUpload = async (itemId: string) => {
    setUploadingItemId(itemId);
  };

  const handleCameraCapture = async (itemId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const uploadURL = await objectStorageService.getUploadURL();
        const uploadResponse = await fetch(uploadURL, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });
        if (!uploadResponse.ok) throw new Error('Upload failed');
        const photoUrl = await objectStorageService.setObjectAclPolicy(uploadURL, { visibility: 'private' });
        createPhotoMutation.mutate({ itemId, photoUrl, visibleToClient: true });
        toast({ title: language === 'ru' ? "Фото добавлено" : "Photo added" });
      } catch (error) {
        console.error('Camera capture error:', error);
        toast({
          title: language === 'ru' ? "Ошибка" : "Error",
          description: language === 'ru' ? "Не удалось сделать фото" : "Failed to capture photo",
          variant: "destructive",
        });
      }
    };
    input.click();
  };

  const handleGetUploadParameters = async () => {
    try {
      const uploadURL = await objectStorageService.getUploadURL();
      return { method: 'PUT' as const, url: uploadURL };
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
    if (result.successful?.length > 0 && uploadingItemId) {
      try {
        for (const uploadedFile of result.successful) {
          const photoUrl = await objectStorageService.setObjectAclPolicy(uploadedFile.uploadURL, {
            visibility: 'public',
          });
          await createPhotoMutation.mutateAsync({
            itemId: uploadingItemId,
            photoUrl,
            visibleToClient: false,
          });
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

  if (isLoading && !sheet) return <DetailSkeleton />;

  if (!sheet) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--corp-bg)' }}>
        <p style={{ color: 'var(--corp-muted)' }}>
          {language === 'ru' ? 'Лист не найден' : 'Sheet not found'}
        </p>
      </div>
    );
  }

  const totalProgress = parseFloat(sheet.totalProgress || "0");

  const goBack = () => setLocation(`/projects/${sheet.projectId}/implementation-sheets`);

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--corp-bg)' }} data-page-header>
      <CorpHeader
        title={sheet.name}
        onBack={goBack}
        action={
          <StatusPill
            active={sheet.status === 'active'}
            labelOn={language === 'ru' ? 'Активный' : 'Active'}
            labelOff={language === 'ru' ? 'Завершен' : 'Completed'}
          />
        }
      />

      <div className="p-4 space-y-4">
        {/* Total Progress */}
        <div className="p-4" style={ITEM_CARD_STYLE}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>
              {language === 'ru' ? 'Общий прогресс' : 'Total Progress'}
            </span>
            <span
              className="text-[16px] font-bold"
              style={{ color: 'var(--corp-ink)', fontFamily: 'var(--corp-mono)' }}
            >
              {totalProgress.toFixed(0)}%
            </span>
          </div>
          <ProgressBar value={totalProgress} height={8} />
        </div>

        {/* Items */}
        <div className="space-y-3">
          {sheet.items?.map((item) => (
            <div
              key={item.id}
              className="p-4 overflow-hidden"
              style={{ ...ITEM_CARD_STYLE, opacity: item.isCompleted ? 0.75 : 1 }}
            >
              <div className="flex items-start gap-3">
                {/* Completion toggle */}
                {canManageItems ? (
                  <button
                    type="button"
                    className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded transition-colors"
                    onClick={() => handleToggleComplete(item)}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--corp-surface-2)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    data-testid={`button-toggle-${item.id}`}
                  >
                    {item.isCompleted
                      ? <CheckCircle className="h-5 w-5" style={{ color: 'var(--corp-pos)' }} />
                      : <Circle className="h-5 w-5" style={{ color: 'var(--corp-ink-3)' }} />
                    }
                  </button>
                ) : (
                  <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center">
                    {item.isCompleted
                      ? <CheckCircle className="h-5 w-5" style={{ color: 'var(--corp-pos)' }} />
                      : <Circle className="h-5 w-5" style={{ color: 'var(--corp-ink-3)' }} />
                    }
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`text-[13px] font-semibold leading-snug ${item.isCompleted ? 'line-through' : ''}`}
                        style={{ color: 'var(--corp-ink)' }}
                      >
                        <span style={{ color: 'var(--corp-muted)', fontFamily: 'var(--corp-mono)', marginRight: 4 }}>
                          {item.position}.
                        </span>
                        {item.name}
                      </h3>
                      {item.totalCost && isAdminOrDirector && (
                        <div className="mt-1">
                          <MoneyAED amount={item.totalCost} size={13} weight={700} tone="ink" />
                        </div>
                      )}
                    </div>

                    {isAdminOrDirector && (
                      <button
                        type="button"
                        className="w-6 h-6 flex items-center justify-center rounded transition-colors flex-shrink-0"
                        onClick={() => handleToggleVisibility(item)}
                        style={{ color: 'var(--corp-ink-3)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--corp-surface-2)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        data-testid={`button-visibility-${item.id}`}
                      >
                        {item.visibleToClient ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      </button>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="mb-3">
                    {isEditMode === item.id ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px]" style={{ color: 'var(--corp-muted)' }}>
                            {language === 'ru' ? 'Прогресс' : 'Progress'}
                          </Label>
                          <span
                            className="text-[12px] font-bold"
                            style={{ color: 'var(--corp-ink)', fontFamily: 'var(--corp-mono)' }}
                          >
                            {editProgress}%
                          </span>
                        </div>
                        <Slider
                          value={[editProgress]}
                          onValueChange={([value]) => setEditProgress(value)}
                          max={100}
                          step={5}
                          className="w-full"
                        />
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 h-7 px-3 text-[11px] font-semibold transition-colors"
                            style={{ background: 'var(--corp-accent)', color: '#fff', borderRadius: 'var(--corp-r-sm)' }}
                            onClick={() => handleProgressUpdate(item.id, editProgress)}
                            data-testid={`button-save-progress-${item.id}`}
                          >
                            <Save className="h-3 w-3" />
                            {language === 'ru' ? 'Сохранить' : 'Save'}
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 h-7 px-3 text-[11px] font-semibold transition-colors"
                            style={{ background: 'var(--corp-surface-2)', color: 'var(--corp-ink-2)', borderRadius: 'var(--corp-r-sm)' }}
                            onClick={() => setIsEditMode(null)}
                            data-testid={`button-cancel-progress-${item.id}`}
                          >
                            <X className="h-3 w-3" />
                            {language === 'ru' ? 'Отмена' : 'Cancel'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px]" style={{ color: 'var(--corp-muted)' }}>
                            {language === 'ru' ? 'Прогресс' : 'Progress'}
                          </span>
                          <span
                            className="text-[11px] font-bold"
                            style={{ color: 'var(--corp-ink)', fontFamily: 'var(--corp-mono)' }}
                          >
                            {item.progress}%
                          </span>
                        </div>
                        <ProgressBar value={item.progress} height={6} />
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {!isEditMode && (canManageItems || user?.id === item.lastUpdatedBy) && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 h-7 px-2.5 text-[11px] font-semibold transition-colors"
                        style={{ background: 'var(--corp-surface-2)', color: 'var(--corp-ink-2)', borderRadius: 'var(--corp-r-sm)' }}
                        onClick={() => {
                          setIsEditMode(item.id);
                          setEditProgress(item.progress);
                        }}
                        data-testid={`button-edit-progress-${item.id}`}
                      >
                        <Edit className="h-3 w-3" />
                        {language === 'ru' ? 'Изменить' : 'Edit'}
                      </button>
                    )}

                    <button
                      type="button"
                      className="inline-flex items-center gap-1 h-7 px-2.5 text-[11px] font-semibold transition-colors"
                      style={{ background: 'var(--corp-surface-2)', color: 'var(--corp-ink-2)', borderRadius: 'var(--corp-r-sm)' }}
                      onClick={() => setSelectedItem(item)}
                      data-testid={`button-view-photos-${item.id}`}
                    >
                      <ImageIcon className="h-3 w-3" />
                      {language === 'ru' ? 'Фото' : 'Photos'}
                    </button>

                    <button
                      type="button"
                      className="inline-flex items-center gap-1 h-7 px-2.5 text-[11px] font-semibold transition-colors"
                      style={{ background: 'var(--corp-surface-2)', color: 'var(--corp-ink-2)', borderRadius: 'var(--corp-r-sm)' }}
                      onClick={() => setSelectedItemForComments(item)}
                      data-testid={`button-view-comments-${item.id}`}
                    >
                      <MessageSquare className="h-3 w-3" />
                      {language === 'ru' ? 'Комментарии' : 'Comments'}
                    </button>

                    {canManagePhotos && (
                      uploadingItemId === item.id ? (
                        <ObjectUploader
                          maxNumberOfFiles={10}
                          maxFileSize={100 * 1024 * 1024}
                          allowedFileTypes={['image/*', 'video/*']}
                          onGetUploadParameters={handleGetUploadParameters}
                          onComplete={handleUploadComplete}
                        >
                          <Camera className="h-3 w-3 mr-1" />
                          📷🎥
                        </ObjectUploader>
                      ) : (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 h-7 px-2.5 text-[11px] font-semibold transition-colors"
                            style={{ background: 'var(--corp-surface-2)', color: 'var(--corp-ink-2)', borderRadius: 'var(--corp-r-sm)' }}
                            onClick={() => handlePhotoUpload(item.id)}
                            data-testid={`button-upload-photo-${item.id}`}
                          >
                            <Plus className="h-3 w-3" />
                            {language === 'ru' ? 'Добавить' : 'Add'}
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 h-7 px-2.5 text-[11px] font-semibold transition-colors"
                            style={{ background: 'var(--corp-surface-2)', color: 'var(--corp-ink-2)', borderRadius: 'var(--corp-r-sm)' }}
                            onClick={() => handleCameraCapture(item.id)}
                            data-testid={`button-camera-capture-${item.id}`}
                          >
                            <Camera className="h-3 w-3" />
                            {language === 'ru' ? 'Камера' : 'Camera'}
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Photo viewer dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {language === 'ru' ? 'Фотографии позиции' : 'Item Photos'}: {selectedItem?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {sortedPhotos?.map((photo, index) => (
              <div key={photo.id} className="relative group flex-shrink-0">
                <img
                  src={photo.photoUrl}
                  alt={photo.caption || ''}
                  className={`w-24 h-24 object-cover cursor-pointer transition-all`}
                  style={{
                    borderRadius: 'var(--corp-r)',
                    border: selectedPhoto?.id === photo.id
                      ? '2px solid var(--corp-accent)'
                      : '2px solid var(--corp-line)',
                  }}
                  onClick={() => {
                    setSelectedPhoto(photo);
                    setCurrentPhotoIndex(index);
                  }}
                />
                {canDeletePhoto(photo) && (
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
                <span
                  className="absolute bottom-1 left-1 inline-flex items-center justify-center h-4 px-1"
                  style={{
                    background: photo.visibleToClient ? 'var(--corp-accent)' : 'var(--corp-ink-2)',
                    color: '#fff',
                    borderRadius: 'var(--corp-r-sm)',
                  }}
                >
                  {photo.visibleToClient ? <Eye className="h-2 w-2" /> : <EyeOff className="h-2 w-2" />}
                </span>
                <span
                  className="absolute top-1 left-1 inline-flex items-center justify-center h-4 px-1 text-[10px] font-bold"
                  style={{
                    background: 'rgba(0,0,0,0.5)',
                    color: '#fff',
                    borderRadius: 'var(--corp-r-sm)',
                    fontFamily: 'var(--corp-mono)',
                  }}
                >
                  {index + 1}
                </span>
              </div>
            ))}
          </div>

          {(sortedPhotos?.length || 0) > 6 && (
            <div className="grid gap-3 sm:grid-cols-3 mt-4">
              {sortedPhotos?.map((photo, index) => (
                <div key={photo.id} className="relative group">
                  <img
                    src={photo.photoUrl}
                    alt={photo.caption || ''}
                    className={`w-full h-32 object-cover cursor-pointer transition-all`}
                    style={{
                      borderRadius: 'var(--corp-r)',
                      border: selectedPhoto?.id === photo.id
                        ? '2px solid var(--corp-accent)'
                        : '2px solid var(--corp-line)',
                    }}
                    onClick={() => {
                      setSelectedPhoto(photo);
                      setCurrentPhotoIndex(index);
                    }}
                  />
                  {photo.caption && (
                    <p className="text-[11px] mt-1 truncate" style={{ color: 'var(--corp-muted)' }}>
                      {photo.caption}
                    </p>
                  )}
                  {canDeletePhoto(photo) && (
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
                  <span
                    className="absolute bottom-1 left-1 inline-flex items-center justify-center h-4 px-1"
                    style={{
                      background: photo.visibleToClient ? 'var(--corp-accent)' : 'var(--corp-ink-2)',
                      color: '#fff',
                      borderRadius: 'var(--corp-r-sm)',
                    }}
                  >
                    {photo.visibleToClient ? <Eye className="h-2 w-2" /> : <EyeOff className="h-2 w-2" />}
                  </span>
                  <span
                    className="absolute top-1 left-1 inline-flex items-center justify-center h-4 px-1 text-[10px] font-bold"
                    style={{
                      background: 'rgba(0,0,0,0.5)',
                      color: '#fff',
                      borderRadius: 'var(--corp-r-sm)',
                      fontFamily: 'var(--corp-mono)',
                    }}
                  >
                    {index + 1}
                  </span>
                </div>
              ))}
            </div>
          )}

          {sortedPhotos?.length === 0 && (
            <div className="text-center py-8">
              <Camera className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--corp-ink-3)' }} />
              <p style={{ color: 'var(--corp-muted)' }}>
                {language === 'ru' ? 'Нет фотографий' : 'No photos'}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Full size photo viewer */}
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
