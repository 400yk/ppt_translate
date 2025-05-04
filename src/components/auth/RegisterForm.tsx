'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useTranslation, LOCALE_CHANGE_EVENT } from '@/lib/i18n';
import { Icons } from '@/components/icons';

export default function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [codeValid, setCodeValid] = useState<boolean | null>(null);
  const [codeMessage, setCodeMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [forceRender, setForceRender] = useState(0);
  
  const { register, verifyInvitationCode } = useAuth();
  const { toast } = useToast();
  const { t, locale } = useTranslation();

  // Force component re-render on locale change
  useEffect(() => {
    const handleLocaleChange = () => {
      // Increment to force a re-render
      setForceRender(prev => prev + 1);
      
      // Re-check invitation code to update message language
      if (codeValid === true && invitationCode) {
        checkInvitationCode(invitationCode);
      }
    };
    
    window.addEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
    return () => {
      window.removeEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
    };
  }, [codeValid, invitationCode]);

  // Function to check invitation code
  const checkInvitationCode = async (code: string) => {
    if (!code || code.length < 6) {
      setCodeValid(null);
      setCodeMessage('');
      return;
    }
    
    setIsCheckingCode(true);
    try {
      const result = await verifyInvitationCode(code);
      setCodeValid(result.valid);
      
      if (result.valid) {
        // Use translation with variable replacement
        setCodeMessage(t('auth.valid_code').replace('{0}', (result.remaining ?? 0).toString()));
      } else {
        setCodeMessage(result.error || t('auth.invalid_code'));
      }
    } catch (error) {
      setCodeValid(false);
      setCodeMessage(t('errors.verification_error'));
    } finally {
      setIsCheckingCode(false);
    }
  };

  // Verify invitation code when it changes
  useEffect(() => {
    const timeoutId = setTimeout(() => checkInvitationCode(invitationCode), 500);
    return () => clearTimeout(timeoutId);
  }, [invitationCode, forceRender]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!email || !password || !invitationCode) {
      toast({
        title: t('errors.required_fields'),
        description: t('errors.fill_all_fields'),
        variant: 'destructive',
      });
      return;
    }
    
    if (!codeValid) {
      toast({
        title: t('errors.invalid_invitation'),
        description: t('errors.enter_valid_code'),
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Use email as username since we removed the username field
      await register(email, email, password, invitationCode);
      toast({
        title: t('auth.login_success'),
        description: t('auth.welcome_back'),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('errors.unknown_error');
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
      <h2 className="text-2xl font-bold text-center mb-6">{t('auth.register')}</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">        
        <div className="space-y-2">
          <Label htmlFor="email">{t('auth.email')}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.email_placeholder')}
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
        
        <div className="space-y-2">
          <Label htmlFor="invitationCode">
            {t('auth.invitation_code')}
            {isCheckingCode && (
              <Icons.spinner className="ml-2 h-4 w-4 animate-spin inline" />
            )}
          </Label>
          <Input
            id="invitationCode"
            type="text"
            value={invitationCode}
            onChange={(e) => setInvitationCode(e.target.value)}
            placeholder={t('auth.invitation_code_placeholder')}
            disabled={isLoading}
            required
            className={
              codeValid === true
                ? 'border-green-500 focus:border-green-500'
                : codeValid === false
                ? 'border-red-500 focus:border-red-500'
                : ''
            }
          />
          {codeMessage && (
            <p className={`text-sm mt-1 ${
              codeValid ? 'text-green-500' : 'text-red-500'
            }`}>
              {codeMessage}
            </p>
          )}
        </div>
        
        <Button type="submit" className="w-full" disabled={isLoading || !codeValid}>
          {isLoading ? t('common.loading') : t('auth.register')}
        </Button>
      </form>
    </div>
  );
} 