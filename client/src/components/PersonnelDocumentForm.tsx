import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useState } from "react";

const documentSchema = z.object({
  documentType: z.string().min(1, "Тип документа обязателен"),
  documentNumber: z.string().optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  fileUrl: z.string().optional(),
});

type DocumentFormData = z.infer<typeof documentSchema>;

interface PersonnelDocumentFormProps {
  personnelId: string;
  document?: any;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PersonnelDocumentForm({ 
  personnelId, 
  document, 
  open, 
  onClose, 
  onSuccess 
}: PersonnelDocumentFormProps) {
  const { toast } = useToast();
  const [fileUrl, setFileUrl] = useState(document?.fileUrl || "");
  const [fileName, setFileName] = useState(document?.fileName || "");
  const [fileSize, setFileSize] = useState(document?.fileSize || 0);
  const [mimeType, setMimeType] = useState(document?.mimeType || "");
  
  const form = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: document ? {
      documentType: document.documentType,
      documentNumber: document.documentNumber || "",
      issueDate: document.issueDate ? document.issueDate.split('T')[0] : "",
      expiryDate: document.expiryDate ? document.expiryDate.split('T')[0] : "",
      fileUrl: document.fileUrl || "",
    } : {
      documentType: "",
      documentNumber: "",
      issueDate: "",
      expiryDate: "",
      fileUrl: "",
    }
  });
  
  const createMutation = useMutation({
    mutationFn: async (data: DocumentFormData) => {
      return await apiRequest(`/api/personnel/${personnelId}/documents`, {
        method: "POST",
        body: JSON.stringify({ 
          ...data, 
          fileUrl,
          fileName,
          fileSize,
          mimeType
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Документ добавлен",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: async (data: DocumentFormData) => {
      return await apiRequest(`/api/personnel/documents/${document.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...data, fileUrl }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Документ обновлен",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: DocumentFormData) => {
    if (!fileUrl && !document) {
      toast({
        title: "Ошибка",
        description: "Сначала загрузите файл",
        variant: "destructive",
      });
      return;
    }
    
    const submitData = { 
      ...data, 
      fileUrl,
      fileName,
      fileSize,
      mimeType
    };
    if (document) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };
  
  const handleFileUpload = async () => {
    try {
      // Get presigned URL
      console.log("Getting upload URL...");
      const response = await apiRequest("/api/objects/upload", {
        method: "POST",
      });
      const data = await response.json();
      console.log("Upload response data:", data);
      
      if (!data || !data.uploadURL) {
        throw new Error("No upload URL received from server");
      }
      
      return {
        method: "PUT" as const,
        url: data.uploadURL,
      };
    } catch (error) {
      console.error("Failed to get upload URL:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось получить URL для загрузки",
        variant: "destructive",
      });
      throw error;
    }
  };
  
  const handleFileComplete = async (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const file = result.successful[0];
      const uploadURL = file.uploadURL;
      setFileUrl(uploadURL);
      
      // Store file metadata for document creation
      setFileName(file.name || 'document');
      setFileSize(file.size || 0);
      setMimeType(file.type || 'application/octet-stream');
      
      toast({
        title: "Успешно",
        description: "Файл загружен",
      });
    }
  };
  
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {document ? "Редактировать документ" : "Добавить документ"}
          </SheetTitle>
        </SheetHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="documentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Тип документа *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите тип документа" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="emirates_id">Emirates ID</SelectItem>
                      <SelectItem value="passport">Паспорт</SelectItem>
                      <SelectItem value="visa">Виза</SelectItem>
                      <SelectItem value="contract">Трудовой договор</SelectItem>
                      <SelectItem value="medical">Медицинская карта</SelectItem>
                      <SelectItem value="insurance">Страховка</SelectItem>
                      <SelectItem value="qualification">Квалификация</SelectItem>
                      <SelectItem value="other">Другое</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="documentNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Номер документа</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="issueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дата выдачи</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дата окончания</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* File Upload */}
            <div className="space-y-2">
              <FormLabel>Файл документа</FormLabel>
              {fileUrl && (
                <div className="p-2 bg-muted rounded-md text-sm">
                  <p className="text-muted-foreground">Файл загружен</p>
                  <a 
                    href={fileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Просмотреть файл
                  </a>
                </div>
              )}
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={10485760} // 10MB
                onGetUploadParameters={handleFileUpload}
                onComplete={handleFileComplete}
                buttonClassName="w-full"
              >
                {fileUrl ? "Заменить файл" : "Загрузить файл"}
              </ObjectUploader>
            </div>
            
            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Отмена
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending 
                  ? "Сохранение..." 
                  : document ? "Сохранить" : "Добавить"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}