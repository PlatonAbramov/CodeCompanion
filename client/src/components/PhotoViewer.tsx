import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, X, Plus, Minus, RotateCw, Download } from "lucide-react";

interface Photo {
  id: string;
  photoUrl: string;
  caption?: string;
  visibleToClient: boolean;
  uploadedAt: string;
}

interface PhotoViewerProps {
  photo: Photo;
  photos: Photo[];
  currentIndex: number;
  onNavigate: (direction: 'prev' | 'next') => void;
  onClose: () => void;
}

export function PhotoViewer({ photo, photos, currentIndex, onNavigate, onClose }: PhotoViewerProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialScale, setInitialScale] = useState(1);

  // Сброс масштаба и позиции при смене фото
  useEffect(() => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setInitialScale(1);
  }, [photo.id]);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev * 1.5, 5));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev / 1.5, 0.1));
  };

  const handleFitToScreen = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const container = img.parentElement;
    if (!container) return;

    // Получаем размеры контейнера (viewport)
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    // Получаем естественные размеры изображения
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;

    // Вычисляем масштаб для вписывания в экран с отступами
    const scaleX = (containerWidth * 0.9) / imgWidth;
    const scaleY = (containerHeight * 0.9) / imgHeight;
    const fitScale = Math.min(scaleX, scaleY, 1); // Не увеличиваем, только уменьшаем

    setInitialScale(fitScale);
    setScale(fitScale);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > initialScale) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > initialScale) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        onNavigate('prev');
        break;
      case 'ArrowRight':
        onNavigate('next');
        break;
      case 'Escape':
        onClose();
        break;
      case '+':
      case '=':
        handleZoomIn();
        break;
      case '-':
        handleZoomOut();
        break;
      case 'r':
      case 'R':
        handleRotate();
        break;
      case '0':
        handleFitToScreen();
        break;
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = photo.photoUrl;
    link.download = photo.caption || `photo-${photo.id}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isVideo = photo.photoUrl.includes('video') || 
                 photo.photoUrl.match(/\.(mp4|webm|ogg|mov|avi)$/i);

  return (
    <div className="relative w-full h-full bg-black/95 flex items-center justify-center">
      {/* Панель управления сверху */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-2">
        <Badge className="bg-black/70 text-white px-3 py-1">
          {currentIndex + 1} / {photos.length}
        </Badge>
        
        {!isVideo && (
          <div className="flex items-center gap-1 bg-black/70 rounded-lg px-2 py-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={handleZoomOut}
              data-testid="button-zoom-out"
            >
              <Minus className="h-4 w-4" />
            </Button>
            
            <span className="text-white text-sm min-w-[3rem] text-center">
              {Math.round((scale / initialScale) * 100)}%
            </span>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={handleZoomIn}
              data-testid="button-zoom-in"
            >
              <Plus className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={handleRotate}
              data-testid="button-rotate"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 bg-black/70 text-white hover:bg-white/20"
          onClick={handleDownload}
          data-testid="button-download"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Кнопка закрытия */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-20 bg-black/70 hover:bg-white/20 text-white"
        onClick={onClose}
        data-testid="button-close-photo"
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Навигация */}
      {photos.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 bg-black/70 hover:bg-white/20 text-white"
            onClick={() => onNavigate('prev')}
            data-testid="button-prev-photo"
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 bg-black/70 hover:bg-white/20 text-white"
            onClick={() => onNavigate('next')}
            data-testid="button-next-photo"
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        </>
      )}

      {/* Медиа контент */}
      <div 
        className="w-full h-full flex items-center justify-center cursor-pointer select-none overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={(e) => {
          const touch = e.touches[0];
          e.currentTarget.dataset.startX = touch.clientX.toString();
        }}
        onTouchEnd={(e) => {
          const startX = parseFloat(e.currentTarget.dataset.startX || '0');
          const endX = e.changedTouches[0].clientX;
          const diffX = startX - endX;
          
          if (Math.abs(diffX) > 50) {
            if (diffX > 0) {
              onNavigate('next');
            } else {
              onNavigate('prev');
            }
          }
        }}
      >
        {isVideo ? (
          <video
            src={photo.photoUrl}
            controls
            className="max-w-full max-h-full object-contain"
            autoPlay={false}
            style={{
              transform: `rotate(${rotation}deg)`,
            }}
          />
        ) : (
          <img
            src={photo.photoUrl}
            alt={photo.caption || ''}
            className="transition-transform duration-200"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
              cursor: scale > initialScale ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
              maxWidth: 'none',
              maxHeight: 'none'
            }}
            onLoad={handleImageLoad}
            draggable={false}
          />
        )}
      </div>

      {/* Подпись */}
      {photo.caption && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
          <Badge className="bg-black/70 text-white px-4 py-2 max-w-md text-center">
            {photo.caption}
          </Badge>
        </div>
      )}

      {/* Помощь по горячим клавишам */}
      {!isVideo && (
        <div className="absolute bottom-4 right-4 z-20 text-white/60 text-xs">
          <div>← → навигация</div>
          <div>+ - масштаб</div>
          <div>R поворот</div>
          <div>0 по размеру</div>
        </div>
      )}
    </div>
  );
}