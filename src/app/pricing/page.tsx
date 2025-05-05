'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { Check } from 'lucide-react';
import { Icons } from '@/components/icons';
import Image from 'next/image';
import LogoImage from '@/assets/Pure_logo.png';
import Link from 'next/link';

export default function PricingPage() {
  const { t, locale } = useTranslation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  // Fix for hydration error - only render content after client-side mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // If not yet client-side (first render), return minimal content to avoid hydration mismatch
  if (!isClient) {
    return <div className="container max-w-6xl py-10"></div>;
  }

  const handleUpgradeClick = () => {
    if (!isAuthenticated) {
      router.push('/auth'); // Redirect to login when clicking upgrade button if not logged in
    } else {
      // Handle upgrade process for logged-in users
      // This is where you would add actual upgrade functionality
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Link href="/">
                <div className="flex items-center">
                  <Image src={LogoImage} alt="Translide Logo" width={40} height={40} />
                  <span className="text-2xl font-bold ml-2">Translide</span>
                </div>
              </Link>
            </div>
            
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/translate" className="text-foreground hover:text-primary transition">
                Translate Now
              </Link>
              <Link href="/pricing" className="text-foreground hover:text-primary transition">
                Pricing
              </Link>
              {isAuthenticated ? (
                <Button onClick={() => router.push('/translate')} variant="outline" className="flex items-center gap-2">
                  <Icons.user className="h-4 w-4" />
                  <span>{user?.username}</span>
                </Button>
              ) : (
                <Button onClick={() => router.push('/auth')} variant="outline">Login</Button>
              )}
            </nav>
            
            {/* Mobile menu button - can be expanded in the future */}
            <div className="md:hidden">
              <Button variant="ghost" size="icon">
                <Icons.menu className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container max-w-6xl py-10 mx-auto">
        <div className="space-y-6 text-center mb-12">
          <h1 className="text-4xl font-bold">🔥 {t('pricing.title')}</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t('pricing.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          <Card className="p-6 flex flex-col">
            <div className="space-y-2 mb-6">
              <h2 className="text-2xl font-bold">{t('pricing.free_plan')}</h2>
              <p className="text-muted-foreground">{t('pricing.free_desc')}</p>
            </div>
            
            <div className="space-y-2 mb-6">
              <p className="text-3xl font-bold">$0</p>
              <p className="text-muted-foreground">Forever free</p>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4 flex-grow">
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">1 PPT/week</p>
                  <p className="text-sm text-muted-foreground">{t('pricing.features.upload_limit')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">25,000 characters</p>
                  <p className="text-sm text-muted-foreground">{t('pricing.features.char_per_file')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">100,000 characters</p>
                  <p className="text-sm text-muted-foreground">{t('pricing.features.monthly_limit')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">50 MB</p>
                  <p className="text-sm text-muted-foreground">{t('pricing.features.file_size')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Community support</p>
                  <p className="text-sm text-muted-foreground">{t('pricing.features.support')}</p>
                </div>
              </div>
            </div>

            <Button 
              className="mt-8 w-full" 
              variant="outline"
              onClick={() => isAuthenticated ? null : router.push('/auth')}
            >
              {isAuthenticated ? t('pricing.current_plan') : t('auth.login')}
            </Button>
          </Card>

          {/* Paid Plan */}
          <Card className="p-6 flex flex-col relative border-primary/50 bg-primary/5">
            <div className="absolute -top-4 right-4 bg-primary text-primary-foreground text-sm px-3 py-1 rounded-full">
              Recommended
            </div>
            
            <div className="space-y-2 mb-6">
              <h2 className="text-2xl font-bold">{t('pricing.paid_plan')}</h2>
              <p className="text-muted-foreground">{t('pricing.paid_desc')}</p>
            </div>
            
            <div className="space-y-2 mb-6">
              <p className="text-3xl font-bold">$7.99<span className="text-lg font-normal">/month</span></p>
              <p className="text-sm text-muted-foreground">$6.79/month billed yearly (15% off)</p>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4 flex-grow">
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Unlimited uploads</p>
                  <p className="text-sm text-muted-foreground">{t('pricing.features.upload_limit')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Unlimited characters per file</p>
                  <p className="text-sm text-muted-foreground">{t('pricing.features.char_per_file')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">5,000,000 characters</p>
                  <p className="text-sm text-muted-foreground">{t('pricing.features.monthly_limit')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Unlimited file size</p>
                  <p className="text-sm text-muted-foreground">{t('pricing.features.file_size')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Priority email support</p>
                  <p className="text-sm text-muted-foreground">{t('pricing.features.support')}</p>
                </div>
              </div>
            </div>

            <Button className="mt-8 w-full" variant="default" onClick={handleUpgradeClick}>
              {t('pricing.upgrade')}
            </Button>
          </Card>
        </div>

        <div className="mt-16 max-w-3xl mx-auto p-6 bg-muted rounded-lg">
          <h3 className="text-xl font-bold mb-4 text-center">Frequently Asked Questions</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium">Can I change plans at any time?</h4>
              <p className="text-muted-foreground">Yes, you can upgrade or downgrade your plan at any time.</p>
            </div>
            <div>
              <h4 className="font-medium">What happens when I reach my character limit?</h4>
              <p className="text-muted-foreground">You'll need to wait until the next month or upgrade to continue translating.</p>
            </div>
            <div>
              <h4 className="font-medium">Do you offer refunds?</h4>
              <p className="text-muted-foreground">We offer a 7-day money-back guarantee for new paid subscribers.</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="border-t py-8 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <Image src={LogoImage} alt="Translide Logo" width={30} height={30} className="mr-2" />
              <span className="font-medium">Translide</span>
            </div>
            <div className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Translide. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 