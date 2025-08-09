import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { HardHat, Globe } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { user, login, isLoggingIn } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [, setLocation] = useLocation();

  // Redirect logic is handled by AuthenticatedApp component

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ username, password });
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ru' ? 'en' : 'ru');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <HardHat className="text-white text-2xl" size={32} />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                {t('loginTitle')}
              </h1>
              <p className="text-slate-600">
                {t('loginSubtitle')}
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('username')}
                </Label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('username')}
                  required
                  className="w-full px-4 py-3"
                />
              </div>
              
              <div>
                <Label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('password')}
                </Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('password')}
                  required
                  className="w-full px-4 py-3"
                />
              </div>
              
              <Button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                {isLoggingIn ? t('loading') : t('login')}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <Button
                variant="ghost"
                onClick={toggleLanguage}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                <Globe className="mr-1" size={16} />
                {language === 'ru' ? 'English' : 'Русский'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
