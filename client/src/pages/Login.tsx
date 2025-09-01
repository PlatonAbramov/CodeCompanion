import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { HardHat, Globe } from "lucide-react";
import logoImage from "@assets/1 (1)_1756713794265.jpg";

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
    <div className="min-h-screen bg-gradient-to-br from-amber-900 to-stone-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="w-80 h-32 mx-auto mb-4 rounded-xl overflow-hidden shadow-lg">
                <img 
                  src={logoImage} 
                  alt="PLATON ABRAMOV GROUP" 
                  className="w-full h-full object-cover"
                />
              </div>
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
                className="w-full bg-amber-900 text-white py-3 rounded-lg font-medium hover:bg-stone-900 transition-colors"
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
