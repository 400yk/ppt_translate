'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/lib/i18n';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import { resetGuestUsageAfterRegistration } from '@/lib/guest-session';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useEffect } from 'react';

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

  // Monitor authentication state to detect successful login/registration
  useEffect(() => {
    // If the user becomes authenticated, it means login/registration was successful
    if (isAuthenticated) {
      // Reset guest usage if it was a registration
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
    }
  }, [isAuthenticated, router, toast, t, onAuthSuccess, activeTab]);

  // Call onTabChange when activeTab changes
  useEffect(() => {
    if (onTabChange) {
      onTabChange(activeTab);
    }
  }, [activeTab, onTabChange]);

  return (
    <Tabs 
      defaultValue={defaultTab} 
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as 'login' | 'register')}
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