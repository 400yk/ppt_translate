'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useTranslation, LOCALE_CHANGE_EVENT } from '@/lib/i18n';
import { useRouter } from 'next/navigation';
import { getApiErrorMessage } from '@/lib/api-client';
import GoogleSignInButton from './GoogleSignInButton';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const router = useRouter();
  
  // Force component re-render on locale change (used to refresh button)
  const [, setForceRender] = useState(0);
  
  useEffect(() => {
    const handleLocaleChange = () => setForceRender(prev => prev + 1);
    window.addEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
    return () => window.removeEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: t('errors.required_fields'),
        description: t('errors.fill_all_fields'),
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      await login(username, password);
      toast({
        title: t('auth.login_success'),
        description: t('auth.welcome_back'),
      });
      // Redirect to translate page after successful login
      router.push('/translate');
    } catch (error) {
      const errorMessage = getApiErrorMessage(error);
      toast({
        title: t('errors.login_failed'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">{t('auth.username')}</Label>
          <Input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t('auth.username_placeholder')}
            disabled={isLoading}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">{t('auth.password')}</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.password_placeholder')}
            disabled={isLoading}
            required
          />
        </div>
        
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? t('common.loading') : t('auth.login')}
        </Button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-muted-foreground dark:bg-gray-800">
              {t('auth.or_continue_with')}
            </span>
          </div>
        </div>

        <div className="flex justify-center w-full">
          <GoogleSignInButton width={300} />
        </div>
      </form>
    </div>
  );
} 