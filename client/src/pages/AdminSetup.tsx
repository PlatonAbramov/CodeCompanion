import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function AdminSetup() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const initializeAdmin = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/init-admin', {
        method: 'GET'
      });
      
      const data = await response.json();
      setResult(data);
      
      if (response.ok) {
        toast({
          title: "Успешно",
          description: data.message,
        });
      } else {
        toast({
          title: "Ошибка",
          description: data.error || "Произошла ошибка",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось подключиться к серверу",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Настройка Администратора</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={initializeAdmin} 
            disabled={loading}
            className="w-full"
            data-testid="button-init-admin"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Создать Администратора
          </Button>

          {result && (
            <div className="mt-4 p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                {result.status === 'created' || result.status === 'exists' ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="font-medium">{result.message}</span>
              </div>
              
              {(result.status === 'created' || result.status === 'exists') && (
                <div className="mt-3 text-sm space-y-1">
                  <div><strong>Логин:</strong> {result.username}</div>
                  <div><strong>Пароль:</strong> {result.password}</div>
                  <div className="text-green-600 mt-2">
                    Теперь вы можете войти в систему с этими данными
                  </div>
                </div>
              )}
              
              {result.error && (
                <div className="mt-2 text-sm text-red-600">
                  <strong>Детали ошибки:</strong> {result.details}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}