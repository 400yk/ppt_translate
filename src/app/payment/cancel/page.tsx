'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { Icons } from '@/components/icons';
import { DynamicHead } from '@/components/dynamic-head';

export default function PaymentCancelPage() {
  const { t } = useTranslation();
  const router = useRouter();
  // Add state to prevent hydration mismatch
  const [isClient, setIsClient] = useState(false);
  
  // Use useEffect to mark when component is client-rendered
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const handleReturnToProfile = () => {
    router.push('/profile');
  };
  
  // Only render the full content on the client to avoid hydration errors
  if (!isClient) {
    return <div className="min-h-screen"></div>;
  }
  
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <DynamicHead title={t('payment.error')} />
      
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            {t('payment.error')}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex justify-center items-center py-10">
          <div className="flex flex-col items-center space-y-4">
            <div className="rounded-full bg-amber-100 p-3">
              <Icons.info className="h-8 w-8 text-amber-600" />
            </div>
            <p className="text-center text-muted-foreground">
              {t('payment.cancel_description')}
            </p>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-center">
          <Button onClick={handleReturnToProfile}>
            {t('auth.back_to_home')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 