'use client';

import { useRouter } from 'next/navigation';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { DynamicHead } from '@/components/dynamic-head';

interface GuestExpiredProps {
  locale: string;
  onRegister: () => void;
}

export function GuestExpired({ locale, onRegister }: GuestExpiredProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DynamicHead />
      <div className="container mx-auto px-4 py-8 max-w-6xl flex flex-col items-center justify-center h-full flex-1">
        <div className="w-full max-w-md p-8 border rounded-lg shadow-lg bg-white text-center">
          <Icons.info className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-4">
            {locale === 'zh' ? '访客翻译已用完' : 'Guest Translation Used'}
          </h2>
          <p className="mb-6 text-gray-600">
            {locale === 'zh' 
              ? '您已经使用完了作为访客用户的免费翻译次数。请注册账号以继续使用我们的服务。' 
              : 'You have used your free guest translation. Please register an account to continue using our service.'}
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={onRegister} className="w-full">
              {locale === 'zh' ? '注册账号' : 'Register Now'}
            </Button>
            <Button variant="outline" onClick={() => router.push('/')} className="w-full">
              {locale === 'zh' ? '返回首页' : 'Back to Home'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 