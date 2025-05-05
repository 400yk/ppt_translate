'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTranslation, LOCALE_CHANGE_EVENT } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { Check } from 'lucide-react';
import { Icons } from '@/components/icons';
import Image from 'next/image';
import LogoImage from '@/assets/Pure_logo.png';
import Link from 'next/link';
import { LanguageSelector } from '@/components/language-selector';
import { DynamicHead } from '@/components/dynamic-head';

// Pricing data with locale support
const pricingData = {
  en: {
    freePlan: {
      price: "$0",
      period: "Forever free",
      features: {
        uploads: "1 PPT/week",
        charPerFile: "25,000 characters",
        monthlyLimit: "100,000 characters",
        fileSize: "50 MB",
        support: "Community support"
      }
    },
    paidPlan: {
      price: "$7.99",
      period: "/month",
      yearlyInfo: "$6.79/month billed yearly (15% off)",
      features: {
        uploads: "Unlimited uploads",
        charPerFile: "Unlimited characters per file",
        monthlyLimit: "5,000,000 characters",
        fileSize: "Unlimited file size",
        support: "Priority email support"
      }
    },
    recommended: "Recommended",
    faq: {
      title: "Frequently Asked Questions",
      items: [
        {
          question: "Can I change plans at any time?",
          answer: "Yes, you can upgrade or downgrade your plan at any time."
        },
        {
          question: "What happens when I reach my character limit?",
          answer: "You'll need to wait until the next month or upgrade to continue translating."
        },
        {
          question: "Do you offer refunds?",
          answer: "We offer a 7-day money-back guarantee for new paid subscribers."
        }
      ]
    }
  },
  zh: {
    freePlan: {
      price: "￥0",
      period: "永久免费",
      features: {
        uploads: "每周1个PPT",
        charPerFile: "25,000个字符",
        monthlyLimit: "100,000个字符",
        fileSize: "50 MB",
        support: "社区支持"
      }
    },
    paidPlan: {
      price: "￥54.99",
      period: "/月",
      yearlyInfo: "￥46.99/月（按年付费可节省15%）",
      features: {
        uploads: "无限上传",
        charPerFile: "每个文件无字符限制",
        monthlyLimit: "5,000,000个字符",
        fileSize: "无文件大小限制",
        support: "优先电子邮件支持"
      }
    },
    recommended: "推荐",
    faq: {
      title: "常见问题",
      items: [
        {
          question: "我可以随时更改套餐吗？",
          answer: "是的，您可以随时升级或降级您的套餐。"
        },
        {
          question: "当我达到字符限制时会发生什么？",
          answer: "您需要等到下个月或升级才能继续翻译。"
        },
        {
          question: "你们提供退款吗？",
          answer: "我们为新的付费订阅用户提供7天退款保证。"
        }
      ]
    }
  }
};

export default function PricingPage() {
  const { t, locale } = useTranslation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [forceRender, setForceRender] = useState(0);

  // Get the appropriate pricing data based on locale
  const pricing = locale === 'zh' ? pricingData.zh : pricingData.en;

  // Fix for hydration error - only render content after client-side mount
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Force component re-render on locale change
  useEffect(() => {
    const handleLocaleChange = () => {
      // Increment to force a re-render
      setForceRender(prev => prev + 1);
    };
    
    window.addEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
    return () => {
      window.removeEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
    };
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
      <DynamicHead />
      
      {/* Navbar */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Link href="/">
                <div className="flex items-center">
                  <Image src={LogoImage} alt={t('title')} width={40} height={40} />
                  <span className="text-2xl font-bold ml-2">{t('title')}</span>
                </div>
              </Link>
            </div>
            
            <div className="flex items-center gap-4">
              <nav className="hidden md:flex items-center space-x-8">
                <Link href="/translate" className="text-foreground hover:text-primary transition">
                  {t('nav.translate_now')}
                </Link>
                <Link href="/pricing" className="text-foreground hover:text-primary transition">
                  {t('pricing.title')}
                </Link>
              </nav>
              
              {/* Language selector */}
              <div className="ml-6">
                <LanguageSelector width="w-[100px]" />
              </div>
              
              {isAuthenticated ? (
                <Button onClick={() => router.push('/translate')} variant="outline" className="flex items-center gap-2">
                  <Icons.user className="h-4 w-4" />
                  <span>{user?.username}</span>
                </Button>
              ) : (
                <Button onClick={() => router.push('/auth')} variant="outline">{t('auth.login')}</Button>
              )}
            </div>
            
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
              <p className="text-3xl font-bold">{pricing.freePlan.price}</p>
              <p className="text-muted-foreground">{pricing.freePlan.period}</p>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4 flex-grow">
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">{pricing.freePlan.features.uploads}</p>
                  <p className="text-sm text-muted-foreground">{t('pricing.features.upload_limit')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">{pricing.freePlan.features.charPerFile}</p>
                  <p className="text-sm text-muted-foreground">{t('pricing.features.char_per_file')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">{pricing.freePlan.features.monthlyLimit}</p>
                  <p className="text-sm text-muted-foreground">{t('pricing.features.monthly_limit')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">{pricing.freePlan.features.fileSize}</p>
                  <p className="text-sm text-muted-foreground">{t('pricing.features.file_size')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">{pricing.freePlan.features.support}</p>
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
              {pricing.recommended}
            </div>
            
            <div className="space-y-2 mb-6">
              <h2 className="text-2xl font-bold">{t('pricing.paid_plan')}</h2>
              <p className="text-muted-foreground">{t('pricing.paid_desc')}</p>
            </div>
            
            <div className="space-y-2 mb-6">
              <p className="text-3xl font-bold">{pricing.paidPlan.price}<span className="text-lg font-normal">{pricing.paidPlan.period}</span></p>
              <p className="text-sm text-muted-foreground">{pricing.paidPlan.yearlyInfo}</p>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4 flex-grow">
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">{pricing.paidPlan.features.uploads}</p>
                  <p className="text-sm text-muted-foreground">{t('pricing.features.upload_limit')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">{pricing.paidPlan.features.charPerFile}</p>
                  <p className="text-sm text-muted-foreground">{t('pricing.features.char_per_file')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">{pricing.paidPlan.features.monthlyLimit}</p>
                  <p className="text-sm text-muted-foreground">{t('pricing.features.monthly_limit')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">{pricing.paidPlan.features.fileSize}</p>
                  <p className="text-sm text-muted-foreground">{t('pricing.features.file_size')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">{pricing.paidPlan.features.support}</p>
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
          <h3 className="text-xl font-bold mb-4 text-center">{pricing.faq.title}</h3>
          <div className="space-y-4">
            {pricing.faq.items.map((item, index) => (
              <div key={index}>
                <h4 className="font-medium">{item.question}</h4>
                <p className="text-muted-foreground">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="border-t py-8 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <Image src={LogoImage} alt={t('title')} width={30} height={30} className="mr-2" />
              <span className="font-medium">{t('title')}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} {t('landing.copyright')}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 