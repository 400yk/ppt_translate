'use client';

import { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/lib/i18n';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import { resetGuestUsageAfterRegistration } from '@/lib/guest-session';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

interface AuthTabsProps {
  defaultTab?: 'login' | 'register';
  onAuthSuccess?: () => void;
  onTabChange?: (tab: 'login' | 'register') => void;
}

export default function AuthTabs({ defaultTab = 'login', onAuthSuccess, onTabChange }: AuthTabsProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(defaultTab);
  const { t } = useTranslation();
  const { toast } = useToast();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  
  // Use a ref to track if auth success was already handled
  const authSuccessHandled = useRef(false);

  // Monitor authentication state to detect successful login/registration
  useEffect(() => {
    // Skip on initial render and only handle once
    if (!isAuthenticated || authSuccessHandled.current) {
      return;
    }
    
    // Mark as handled to prevent repeated execution
    authSuccessHandled.current = true;
    
    // Reset guest usage only if it was a registration (not login)
    // This gives new users a fresh start but prevents login/logout abuse
    if (activeTab === 'register') {
      resetGuestUsageAfterRegistration();
      
      // Show registration success message
      toast({
        title: t('auth.register'),
        description: t('success.registration_complete'),
      });
    }
    
    // Call the onAuthSuccess callback if provided
    if (onAuthSuccess) {
      onAuthSuccess();
    }
    
    // Redirect to translate page
    router.push('/translate');
  }, [isAuthenticated, router, toast, t, onAuthSuccess, activeTab]);

  // Call onTabChange when activeTab changes
  useEffect(() => {
    if (onTabChange) {
      onTabChange(activeTab);
    }
  }, [activeTab, onTabChange]);

  // Handle tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value as 'login' | 'register');
  };

  return (
    <Tabs 
      defaultValue={defaultTab} 
      value={activeTab}
      onValueChange={handleTabChange}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="login">{t('auth.login')}</TabsTrigger>
        <TabsTrigger value="register">{t('auth.register')}</TabsTrigger>
      </TabsList>
      
      <TabsContent value="login" className="space-y-4">
        <LoginForm />
      </TabsContent>
      
      <TabsContent value="register" className="space-y-4">
        <RegisterForm />
      </TabsContent>
    </Tabs>
  );
} 