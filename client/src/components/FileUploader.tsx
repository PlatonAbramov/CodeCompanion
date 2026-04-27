import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, File } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FileUploaderProps {
  onUpload: (files: Array<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }>) => void;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  accept?: string;
  children?: React.ReactNode;
}

export function FileUploader({
  onUpload,
  maxFiles = 10,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  accept = "*/*",
  children
}: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    // Сбрасываем input, чтобы повторный выбор того же файла снова триггерил onChange
    if (event.target) event.target.value = '';

    // Validate files
    const validFiles = files.filter(file => {
      if (file.size > maxFileSize) {
        toast({
          title: 'Файл слишком большой',
          description: `Файл "${file.name}" превышает максимальный размер ${Math.round(maxFileSize / (1024 * 1024))}MB`,
          variant: 'destructive',
        });
        return false;
      }
      return true;
    });

    if (validFiles.length + selectedFiles.length > maxFiles) {
      toast({
        title: 'Слишком много файлов',
        description: `Максимальное количество файлов: ${maxFiles}`,
        variant: 'destructive',
      });
      return;
    }

    if (validFiles.length === 0) return;
    // Авто-загрузка сразу после выбора — никакого второго клика не нужно.
    void uploadFiles(validFiles);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setSelectedFiles(files);
    setIsUploading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        // Get presigned URL from cloud storage
        const uploadResponse = await fetch('/api/objects/upload', {
          method: 'POST',
          credentials: 'include',
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to get upload URL for ${file.name}`);
        }

        const { uploadURL } = await uploadResponse.json();

        // Upload file to cloud storage
        const uploadToStorage = await fetch(uploadURL, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!uploadToStorage.ok) {
          throw new Error(`Upload failed for ${file.name}`);
        }

        // Set ACL policy and get object path
        const aclResponse = await fetch('/api/objects/acl', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            objectUrl: uploadURL,
            visibility: 'private'
          })
        });

        if (!aclResponse.ok) {
          throw new Error(`Failed to set ACL for ${file.name}`);
        }

        const { objectPath } = await aclResponse.json();

        return {
          fileName: file.name,
          fileUrl: objectPath || uploadURL,
          fileSize: file.size,
          mimeType: file.type
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      onUpload(uploadedFiles);
      setSelectedFiles([]);
      
      toast({
        title: 'Успешно загружено',
        description: `Загружено файлов: ${uploadedFiles.length}`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Ошибка загрузки',
        description: error instanceof Error ? error.message : 'Не удалось загрузить файлы',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          disabled={isUploading}
        >
          <Upload className="w-4 h-4 mr-2" />
          {isUploading ? 'Загрузка…' : (children || 'Выбрать файлы')}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple={maxFiles > 1}
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      {isUploading && selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Загружаются:</p>
          {selectedFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
              <div className="flex items-center gap-2">
                <File className="w-4 h-4 animate-pulse" />
                <span className="text-sm">{file.name}</span>
                <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}