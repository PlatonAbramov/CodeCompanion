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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  needsContractor?: boolean;
}

interface Project {
  id: string;
  name: string;
}

interface Contractor {
  id: string;
  name: string;
  company?: string;
  phone?: string;
  specialization: string;
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
  const [showContractorDialog, setShowContractorDialog] = useState(false);
  const [selectedContractorId, setSelectedContractorId] = useState<string>("");
  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Получаем список проектов
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  // Получаем список подрядчиков
  const { data: contractors = [] } = useQuery<Contractor[]>({
    queryKey: ['/api/contractors'],
  });

  // Мутация для создания расхода
  const createExpenseMutation = useMutation({
    mutationFn: async (data: { expenseData: ParsedExpenseData, contractorId?: string }) => {
      if (!data.expenseData.projectId) {
        throw new Error("Проект не определен");
      }
      
      const response = await apiRequest('/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          projectId: data.expenseData.projectId,
          category: data.expenseData.category,
          amount: data.expenseData.amount.toString(),
          description: data.expenseData.description,
          contractorId: data.contractorId || null,
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
        const parsedExpense = result.data;
        
        // Проверяем, есть ли в тексте "оплата подрядчикам"
        const needsContractor = text.toLowerCase().includes('оплата подрядчикам') || 
                               text.toLowerCase().includes('оплату подрядчикам') ||
                               text.toLowerCase().includes('подрядчикам');
        
        parsedExpense.needsContractor = needsContractor;
        setParsedData(parsedExpense);
        
        if (needsContractor) {
          setShowContractorDialog(true);
        } else {
          setShowConfirmDialog(true);
        }
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
      createExpenseMutation.mutate({ expenseData: parsedData });
    }
  };

  const handleConfirmWithContractor = () => {
    if (parsedData && selectedContractorId) {
      createExpenseMutation.mutate({ 
        expenseData: parsedData, 
        contractorId: selectedContractorId 
      });
      setShowContractorDialog(false);
      setSelectedContractorId("");
    }
  };

  const handleSkipContractor = () => {
    if (parsedData) {
      createExpenseMutation.mutate({ expenseData: parsedData });
      setShowContractorDialog(false);
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
      <Button
        onClick={isListening ? stopListening : startListening}
        disabled={isProcessing}
        className={`bg-primary text-white hover:bg-primary/90 px-6 py-3 rounded-full shadow-md transition-all ${
          isListening ? 'bg-red-500 hover:bg-red-600' : ''
        }`}
      >
        {isProcessing ? (
          <>
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center mr-3">
              <Loader2 size={16} className="text-white animate-spin" />
            </div>
            Обработка...
          </>
        ) : isListening ? (
          <>
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center mr-3">
              <MicOff size={16} className="text-white" />
            </div>
            Остановить
          </>
        ) : (
          <>
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center mr-3">
              <Mic size={16} className="text-white" />
            </div>
            Голос
          </>
        )}
      </Button>

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

      {/* Диалог выбора подрядчика */}
      <Dialog open={showContractorDialog} onOpenChange={setShowContractorDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Выбор подрядчика</DialogTitle>
            <DialogDescription>
              Выберите подрядчика для этого расхода или пропустите, если не требуется
            </DialogDescription>
          </DialogHeader>

          {parsedData && (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center space-y-2">
                    <div className="text-lg font-medium">{parsedData.amount} ₽</div>
                    <div className="text-sm text-muted-foreground">{parsedData.projectName}</div>
                    <Badge>{getCategoryLabel(parsedData.category)}</Badge>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label htmlFor="contractor-select">Подрядчик (опционально):</Label>
                <Select value={selectedContractorId} onValueChange={setSelectedContractorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите подрядчика" />
                  </SelectTrigger>
                  <SelectContent>
                    {contractors.map((contractor) => (
                      <SelectItem key={contractor.id} value={contractor.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{contractor.name}</span>
                          {contractor.company && (
                            <span className="text-xs text-muted-foreground">{contractor.company}</span>
                          )}
                          <span className="text-xs text-muted-foreground">{contractor.specialization}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowContractorDialog(false);
                setParsedData(null);
                setTranscript("");
                setSelectedContractorId("");
              }}
            >
              Отмена
            </Button>
            <Button
              variant="outline"
              onClick={handleSkipContractor}
              disabled={createExpenseMutation.isPending}
            >
              Пропустить
            </Button>
            <Button 
              onClick={handleConfirmWithContractor}
              disabled={createExpenseMutation.isPending || !selectedContractorId}
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