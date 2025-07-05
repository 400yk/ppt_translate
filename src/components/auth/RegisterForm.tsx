'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useTranslation, LOCALE_CHANGE_EVENT } from '@/lib/i18n';
import { Icons } from '@/components/icons';
import { useRouter } from 'next/navigation';
import { getApiErrorMessage } from '@/lib/api-client';
import GoogleSignInButton from './GoogleSignInButton';

interface RegisterFormProps {
  initialReferralCode?: string | null;
}

export default function RegisterForm({ initialReferralCode }: RegisterFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [invitationCode, setInvitationCode] = useState(initialReferralCode || '');
  const [codeValid, setCodeValid] = useState<boolean | null>(null);
  const [codeMessage, setCodeMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [forceRender, setForceRender] = useState(0);
  const [lastVerifiedCode, setLastVerifiedCode] = useState('');
  
  const { register, verifyCode, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const router = useRouter();

  // Memoize the checkInvitationCode function to prevent recreation on each render
  const checkInvitationCode = useCallback(async (code: string) => {
    if (!code || code.length < 6) {
      setCodeValid(null);
      setCodeMessage('');
      return;
    }
    
    // Skip verification if already checking or if we already verified this exact code
    if (isCheckingCode || code === lastVerifiedCode) return;
    
    setIsCheckingCode(true);
    try {
      const result = await verifyCode(code);
      setCodeValid(result.valid);
      setLastVerifiedCode(code); // Remember the code we just verified
      
      if (result.valid) {
        // Use translation with the translation key from backend
        setCodeMessage(result.messageKey ? t(result.messageKey as any) : t('auth.valid_code'));
      } else {
        // Use the error translation key if provided
        setCodeMessage(result.errorKey ? t(result.errorKey as any) : (result.error || t('auth.invalid_code')));
      }
    } catch (error) {
      setCodeValid(false);
      setCodeMessage(t('errors.verification_error'));
    } finally {
      setIsCheckingCode(false);
    }
  }, [verifyCode, t, isCheckingCode, lastVerifiedCode]);

  // Force component re-render on locale change
  useEffect(() => {
    const handleLocaleChange = () => {
      // Increment to force a re-render
      setForceRender(prev => prev + 1);
      
      // Re-check invitation code to update message language only if we have a valid code
      if (codeValid === true && invitationCode && invitationCode.length >= 6) {
        checkInvitationCode(invitationCode);
      }
    };
    
    window.addEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
    return () => {
      window.removeEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
    };
  }, [codeValid, invitationCode, checkInvitationCode]);

  // Verify invitation code when it changes
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    // Only verify if the code is different than the last verified code
    if (invitationCode && 
        invitationCode.length >= 6 && 
        invitationCode !== lastVerifiedCode) {
      timeoutId = setTimeout(() => {
        checkInvitationCode(invitationCode);
      }, 800); // Increased debounce time to prevent frequent API calls
    } else if (!invitationCode || invitationCode.length < 6) {
      setCodeValid(null);
      setCodeMessage('');
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [invitationCode, checkInvitationCode, lastVerifiedCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation for required fields
    if (!email || !password) {
      toast({
        title: t('errors.required_fields'),
        description: t('errors.fill_all_fields'),
        variant: 'destructive',
      });
      return;
    }
    
    // If invitation code is provided but invalid, show error
    if (invitationCode && !codeValid) {
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
      
      // Use a small delay to let the auth state update
      setTimeout(() => {
        // Check if email verification is required (user not logged in immediately)
        if (!isAuthenticated) {
          // Email verification is required
          toast({
            title: t('auth.register_success'),
            description: t('auth.check_email'),
          });
          
          // Redirect to verification page after another short delay
          setTimeout(() => {
            router.push('/verify-email');
          }, 2000);
        }
        // If authenticated, the redirect will be handled by the register page useEffect
      }, 100);
    } catch (error: any) {
      const errorMessage = getApiErrorMessage(error);
      
      toast({
        title: t('errors.registration_failed'),
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
            {t('auth.invitation_code_optional')}
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
        
        <Button 
          type="submit" 
          className="w-full" 
          disabled={isLoading || (invitationCode !== '' && codeValid !== true)}
        >
          {isLoading ? t('common.loading') : t('auth.register')}
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
          <GoogleSignInButton width={300} invitationCode={invitationCode} />
        </div>
      </form>
    </div>
  );
} 