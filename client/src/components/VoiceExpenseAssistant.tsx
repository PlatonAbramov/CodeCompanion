import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface ParsedExpenseData {
  projectName: string;
  projectId?: string;
  amount: number;
  category: string;
  description?: string;
  personName?: string;
  confidence: number;
}

interface Project {
  id: string;
  name: string;
}

interface VoiceExpenseAssistantProps {
  currentProjectId?: string;
  onExpenseCreated?: () => void;
}

export function VoiceExpenseAssistant({ currentProjectId, onExpenseCreated }: VoiceExpenseAssistantProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsedData, setParsedData] = useState<ParsedExpenseData | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Получаем список проектов
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  // Мутация для создания расхода
  const createExpenseMutation = useMutation({
    mutationFn: async (data: ParsedExpenseData) => {
      if (!data.projectId) {
        throw new Error("Проект не определен");
      }
      
      const response = await apiRequest('/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          projectId: data.projectId,
          category: data.category,
          amount: data.amount.toString(),
          description: data.description,
          userId: user?.id,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Ошибка при создании расхода');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      if (parsedData?.projectId) {
        queryClient.invalidateQueries({ queryKey: ['/api/projects', parsedData.projectId, 'expenses'] });
        queryClient.invalidateQueries({ queryKey: ['/api/projects', parsedData.projectId, 'financial-summary'] });
      }
      
      toast({
        title: "Успешно",
        description: "Расход успешно добавлен",
      });
      
      setShowConfirmDialog(false);
      setParsedData(null);
      setTranscript("");
      
      if (onExpenseCreated) {
        onExpenseCreated();
      }
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать расход",
        variant: "destructive",
      });
    },
  });

  // Инициализация Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true; // Изменено на true для продолжительной записи
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'ru-RU';
      recognitionRef.current.maxAlternatives = 1;

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Обновляем транскрипт при получении результатов
        if (finalTranscript || interimTranscript) {
          setTranscript(finalTranscript || interimTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        
        // Обрабатываем разные типы ошибок
        if (event.error === 'no-speech') {
          toast({
            title: "Речь не обнаружена",
            description: "Попробуйте говорить громче или ближе к микрофону",
            variant: "destructive",
          });
        } else if (event.error === 'audio-capture') {
          toast({
            title: "Ошибка микрофона",
            description: "Проверьте доступ к микрофону",
            variant: "destructive",
          });
        } else if (event.error !== 'aborted') {
          toast({
            title: "Ошибка распознавания",
            description: "Не удалось распознать речь. Попробуйте еще раз.",
            variant: "destructive",
          });
        }
        
        setIsListening(false);
        
        // Остановка медиа потока
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      recognitionRef.current.onend = () => {
        // Просто очищаем состояние, обработка будет в stopListening
        setIsListening(false);
        
        // Остановка медиа потока
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };
    }
  }, [toast]);

  const startListening = async () => {
    try {
      // Запрос разрешения на микрофон
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      setTranscript("");
      setParsedData(null);
      
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsListening(true);
        
        toast({
          title: "Слушаю...",
          description: "Произнесите команду для добавления расхода",
        });
      }
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось получить доступ к микрофону",
        variant: "destructive",
      });
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      
      // Остановка медиа потока
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Обрабатываем транскрипт если он есть
      if (transcript) {
        parseVoiceCommand(transcript);
      }
    }
  };

  const parseVoiceCommand = async (text: string) => {
    setIsProcessing(true);
    
    try {
      const response = await apiRequest('/api/voice/parse-expense', {
        method: 'POST',
        body: JSON.stringify({
          transcript: text,
          projects: projects.map(p => ({ id: p.id, name: p.name })),
          currentProjectId,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Ошибка при обработке команды');
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        setParsedData(result.data);
        setShowConfirmDialog(true);
      } else {
        toast({
          title: "Не удалось распознать",
          description: result.message || "Попробуйте сформулировать команду иначе",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error parsing voice command:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обработать голосовую команду",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmExpense = () => {
    if (parsedData) {
      createExpenseMutation.mutate(parsedData);
    }
  };

  const getCategoryLabel = (category: string) => {
    const categories: Record<string, string> = {
      'materials': 'Материалы',
      'labor': 'Работа',
      'transport': 'Транспорт',
      'equipment': 'Оборудование',
      'other': 'Прочее',
    };
    return categories[category] || category;
  };

  return (
    <>

      {/* Диалог подтверждения */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Подтверждение расхода</DialogTitle>
            <DialogDescription>
              Проверьте распознанные данные перед добавлением
            </DialogDescription>
          </DialogHeader>
          
          {parsedData && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Исходный текст:</span>
                    <Badge variant="outline">
                      Уверенность: {Math.round(parsedData.confidence * 100)}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm italic">"{transcript}"</p>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Проект:</Label>
                  <span className="font-medium">{parsedData.projectName}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <Label>Сумма:</Label>
                  <span className="font-medium text-lg">{parsedData.amount} ₽</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <Label>Категория:</Label>
                  <Badge>{getCategoryLabel(parsedData.category)}</Badge>
                </div>
                
                {parsedData.description && (
                  <div className="flex justify-between items-center">
                    <Label>Описание:</Label>
                    <span className="text-sm">{parsedData.description}</span>
                  </div>
                )}
                
                {parsedData.personName && (
                  <div className="flex justify-between items-center">
                    <Label>От кого:</Label>
                    <span className="text-sm">{parsedData.personName}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false);
                setParsedData(null);
                setTranscript("");
              }}
            >
              Отмена
            </Button>
            <Button 
              onClick={handleConfirmExpense}
              disabled={createExpenseMutation.isPending}
            >
              {createExpenseMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Добавление...
                </>
              ) : (
                'Добавить расход'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}