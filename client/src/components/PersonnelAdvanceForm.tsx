import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ObjectUploader } from "@/components/ObjectUploader";
import { FileText, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/components/LanguageProvider";

const advanceSchema = z.object({
  amount: z.string().min(1, "Сумма обязательна"),
  date: z.string().min(1, "Дата обязательна"),
  projectId: z.string().optional(),
  description: z.string().optional(),
});

type AdvanceFormData = z.infer<typeof advanceSchema>;

interface PersonnelAdvanceFormProps {
  personnelId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Project {
  id: string;
  name: string;
}

export function PersonnelAdvanceForm({
  personnelId,
  open,
  onClose,
  onSuccess,
}: PersonnelAdvanceFormProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  
  const form = useForm<AdvanceFormData>({
    resolver: zodResolver(advanceSchema),
    defaultValues: {
      amount: "",
      date: new Date().toISOString().split('T')[0],
      projectId: "",
      description: "",
    },
  });
  
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });
  
  const createMutation = useMutation({
    mutationFn: async (data: AdvanceFormData & { fileUrl?: string }) => {
      return await apiRequest(`/api/personnel/${personnelId}/advances`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Аванс добавлен",
      });
      onSuccess();
      handleClose();
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleSubmit = (data: AdvanceFormData) => {
    createMutation.mutate({
      ...data,
      fileUrl: fileUrl || undefined,
    });
  };
  
  const handleClose = () => {
    form.reset();
    setFileUrl(null);
    onClose();
  };
  
  const handleFileUpload = async () => {
    const response = await apiRequest("/api/objects/upload", {
      method: "POST",
    }) as any;
    return {
      method: "PUT" as const,
      url: response.uploadURL,
    };
  };
  
  const handleFileComplete = async (result: any) => {
    if (result.successful?.[0]?.uploadURL) {
      const uploadUrl = result.successful[0].uploadURL;
      const response = await apiRequest("/api/personnel/advances/document", {
        method: "PUT",
        body: JSON.stringify({ documentUrl: uploadUrl }),
      }) as any;
      setFileUrl(response.objectPath);
      toast({
        title: "Успешно",
        description: "Документ загружен",
      });
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить аванс</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Сумма (AED)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="1000" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Дата</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Проект (необязательно)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите проект" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Описание (необязательно)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Причина выдачи аванса..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-2">
              <FormLabel>Документ (необязательно)</FormLabel>
              {fileUrl ? (
                <div className="flex items-center gap-2 p-2 border rounded">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm flex-1">Документ загружен</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFileUrl(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <ObjectUploader
                  maxNumberOfFiles={1}
                  maxFileSize={10485760}
                  onGetUploadParameters={handleFileUpload}
                  onComplete={handleFileComplete}
                  buttonClassName="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Загрузить документ
                </ObjectUploader>
              )}
            </div>
            
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Отмена
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Добавление..." : "Добавить"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}