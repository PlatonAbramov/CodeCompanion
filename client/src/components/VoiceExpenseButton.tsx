import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

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

interface VoiceExpenseButtonProps {
  currentProjectId?: string;
  onExpenseCreated?: () => void;
}

export function VoiceExpenseButton({ currentProjectId, onExpenseCreated }: VoiceExpenseButtonProps) {
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
  const isHoldingRef = useRef(false);

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
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      
      if (currentProjectId) {
        queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProjectId, 'expenses'] });
        queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProjectId, 'financial-summary'] });
      }
      
      toast({
        title: "Успешно",
        description: "Расход добавлен",
      });
      
      setShowConfirmDialog(false);
      setTranscript("");
      setParsedData(null);
      
      if (onExpenseCreated) {
        onExpenseCreated();
      }
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Инициализация Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
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
        
        if (finalTranscript || interimTranscript) {
          setTranscript(finalTranscript || interimTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        
        if (event.error === 'no-speech' || event.error === 'audio-capture') {
          // Не показываем ошибки для hold-to-talk режима при кратком нажатии
        } else if (event.error !== 'aborted') {
          toast({
            title: "Ошибка распознавания",
            description: "Не удалось распознать речь. Попробуйте еще раз.",
            variant: "destructive",
          });
        }
        
        setIsListening(false);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };
    }
  }, [toast]);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      setTranscript("");
      setParsedData(null);
      
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsListening(true);
        isHoldingRef.current = true;
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

  const stopListening = async () => {
    isHoldingRef.current = false;
    
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Обрабатываем результат если есть транскрипт
      if (transcript.trim()) {
        await processVoiceCommand();
      }
    }
  };

  const processVoiceCommand = async () => {
    if (!transcript.trim()) return;
    
    setIsProcessing(true);
    
    try {
      const response = await apiRequest('/api/voice/parse-expense', {
        method: 'POST',
        body: JSON.stringify({
          transcript: transcript.trim(),
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
        const needsContractor = transcript.toLowerCase().includes('оплата подрядчикам') || 
                               transcript.toLowerCase().includes('оплату подрядчикам') ||
                               transcript.toLowerCase().includes('подрядчикам');
        
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

  // Hold-to-talk обработчики событий
  const handleMouseDown = () => {
    if (!isProcessing && !isListening) {
      startListening();
    }
  };

  const handleMouseUp = () => {
    if (isListening && isHoldingRef.current) {
      stopListening();
    }
  };

  const handleMouseLeave = () => {
    if (isListening && isHoldingRef.current) {
      stopListening();
    }
  };

  // Touch events для мобильных устройств
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!isProcessing && !isListening) {
      startListening();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (isListening && isHoldingRef.current) {
      stopListening();
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={`bg-amber-100 text-amber-800 hover:bg-amber-200 transition-all ${
          isListening ? 'bg-red-100 text-red-800 hover:bg-red-200' : ''
        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={isProcessing}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        data-testid="button-voice-expense"
      >
        {isProcessing ? (
          <Loader2 size={16} className="animate-spin" />
        ) : isListening ? (
          <MicOff size={16} />
        ) : (
          <Mic size={16} />
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
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Отменить
            </Button>
            <Button onClick={handleConfirmExpense} disabled={createExpenseMutation.isPending}>
              {createExpenseMutation.isPending ? "Добавляем..." : "Добавить расход"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог выбора подрядчика */}
      <Dialog open={showContractorDialog} onOpenChange={setShowContractorDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Выбор подрядчика</DialogTitle>
            <DialogDescription>
              Похоже, что это расход на подрядчика. Выберите подрядчика или пропустите этот шаг.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Подрядчик:</Label>
              <Select value={selectedContractorId} onValueChange={setSelectedContractorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите подрядчика" />
                </SelectTrigger>
                <SelectContent>
                  {contractors.map((contractor) => (
                    <SelectItem key={contractor.id} value={contractor.id}>
                      {contractor.name} {contractor.company && `(${contractor.company})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {parsedData && (
              <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm">
                  <strong>Сумма:</strong> {parsedData.amount} ₽
                </div>
                <div className="text-sm">
                  <strong>Описание:</strong> {parsedData.description || "Не указано"}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handleSkipContractor}>
              Пропустить
            </Button>
            <Button 
              onClick={handleConfirmWithContractor} 
              disabled={createExpenseMutation.isPending || !selectedContractorId}
            >
              {createExpenseMutation.isPending ? "Добавляем..." : "Добавить с подрядчиком"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}