import React, { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, AlertCircle, CheckCircle, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Document {
  id: string;
  fileName: string;
  originalName: string;
  fileUrl: string;
  projectId: string;
}

interface CreateImplementationSheetFromInvoiceProps {
  projectId: string;
  onSheetCreated?: () => void;
}

export function CreateImplementationSheetFromInvoice({ projectId, onSheetCreated }: CreateImplementationSheetFromInvoiceProps) {
  const [open, setOpen] = useState(false);
  const [sheetName, setSheetName] = useState("");
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [parseResult, setParseResult] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Загрузка документов проекта
  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: [`/api/projects/${projectId}/documents`],
    enabled: open && !!projectId
  });

  // Фильтрация документов, которые начинаются с "invoice"
  const invoiceDocuments = documents.filter(doc => 
    doc.fileName.toLowerCase().startsWith('invoice')
  );

  const createSheetMutation = useMutation({
    mutationFn: async (data: { name: string; documentId: string }) => {
      return apiRequest(`/api/projects/${projectId}/implementation-sheets/parse-invoice`, {
        method: 'POST',
        body: data
      });
    },
    onSuccess: (result: any) => {
      toast({
        title: "Лист реализации создан",
        description: `Успешно создан лист "${result.sheet.name}" с ${result.parsedItems} позициями из ${result.format} документа`,
      });
      setOpen(false);
      setSheetName("");
      setSelectedDocumentId("");
      setParseResult(null);
      onSheetCreated?.();
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/implementation-sheets`] });
    },
    onError: (error: any) => {
      const errorData = error?.body || error || {};
      setParseResult(errorData);
      
      if (errorData.suggestColumnMapping) {
        toast({
          title: "Требуется настройка колонок",
          description: "Не удалось автоматически определить структуру документа. Проверьте формат файла.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Ошибка создания листа",
          description: errorData.details?.[0] || errorData.error || "Неизвестная ошибка",
          variant: "destructive"
        });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sheetName.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите название листа реализации",
        variant: "destructive"
      });
      return;
    }
    
    if (!selectedDocumentId) {
      toast({
        title: "Ошибка", 
        description: "Выберите документ инвойса",
        variant: "destructive"
      });
      return;
    }

    createSheetMutation.mutate({
      name: sheetName,
      documentId: selectedDocumentId
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          data-testid="button-create-sheet-from-invoice"
        >
          <Upload className="w-4 h-4" />
          Создать из инвойса
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Создать лист реализации из инвойса</DialogTitle>
          <DialogDescription>
            Автоматически создать лист реализации на основе загруженного инвойса
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Информация о процессе */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Как это работает</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5 text-xs">1</Badge>
                <span>Система найдет документ с названием, начинающимся на "invoice"</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5 text-xs">2</Badge>
                <span>Автоматически извлечет таблицу из PDF, XLSX или CSV</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5 text-xs">3</Badge>
                <span>Создаст позиции с наименованием, количеством, ценой и суммой</span>
              </div>
            </CardContent>
          </Card>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            {/* Выбор документа */}
            <div className="space-y-2">
              <Label htmlFor="document-select">Документ инвойса</Label>
              {invoiceDocuments.length > 0 ? (
                <Select
                  value={selectedDocumentId}
                  onValueChange={setSelectedDocumentId}
                  data-testid="select-invoice-document"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите документ инвойса" />
                  </SelectTrigger>
                  <SelectContent>
                    {invoiceDocuments.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          <span className="truncate">{doc.originalName || doc.fileName}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    Не найдено документов с названием, начинающимся на "invoice". 
                    Загрузите инвойс в раздел "Документы" проекта.
                  </AlertDescription>
                </Alert>
              )}
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
                onClick={() => setOpen(false)}
                data-testid="button-cancel"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={createSheetMutation.isPending || !selectedDocumentId || !sheetName.trim()}
                data-testid="button-create-sheet"
              >
                {createSheetMutation.isPending ? "Создание..." : "Создать лист"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}