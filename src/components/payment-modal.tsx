'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Check } from 'lucide-react';
import { usePricing } from '@/lib/pricing-service';
import { useMembership } from '@/lib/membership-service';

// Pricing data with benefits based on locale
const pricingBenefits = {
  en: [
    "Unlimited uploads",
    "Unlimited characters per file",
    "5,000,000 characters monthly limit",
    "Unlimited file size",
    "Priority email support"
  ],
  zh: [
    "无限上传",
    "每个文件无字符限制",
    "5,000,000个字符每月限制",
    "无文件大小限制",
    "优先电子邮件支持"
  ]
};

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PaymentModal({ isOpen, onClose, onSuccess }: PaymentModalProps) {
  const { t, locale } = useTranslation();
  const { toast } = useToast();
  const { pricing, isLoading } = usePricing();
  const { isProcessing, purchaseMembership } = useMembership();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');

  // Get benefits in current language
  const benefits = locale === 'zh' ? pricingBenefits.zh : pricingBenefits.en;

  const handlePayment = async () => {
    // Process payment through membership service
    const success = await purchaseMembership(selectedPlan);
    
    if (success) {
      // Call the onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
      // Close modal on success
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{t('payment.title')}</DialogTitle>
          <DialogDescription>{t('payment.subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Monthly subscription option */}
            <Card 
              className={`cursor-pointer border-2 hover:border-primary transition-all ${selectedPlan === 'monthly' ? 'border-primary' : 'border-border'}`}
              onClick={() => setSelectedPlan('monthly')}
            >
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{t('pricing.monthly')}</CardTitle>
                  {selectedPlan === 'monthly' && (
                    <Icons.check className="h-5 w-5 text-primary" />
                  )}
                </div>
                <CardDescription>{t('payment.billed_monthly')}</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-8 w-24 bg-muted animate-pulse rounded"></div>
                ) : (
                  <div className="text-3xl font-bold mb-1">
                    {pricing.monthly.display}
                    <span className="text-base font-normal text-muted-foreground">/{locale === 'zh' ? '月' : 'mo'}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Yearly subscription option */}
            <Card 
              className={`cursor-pointer border-2 hover:border-primary transition-all ${selectedPlan === 'yearly' ? 'border-primary' : 'border-border'}`}
              onClick={() => setSelectedPlan('yearly')}
            >
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    {t('pricing.yearly')}
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                      -{pricing.yearly.discount}%
                    </Badge>
                  </CardTitle>
                  {selectedPlan === 'yearly' && (
                    <Icons.check className="h-5 w-5 text-primary" />
                  )}
                </div>
                <CardDescription>{t('payment.billed_yearly')}</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    <div className="h-8 w-24 bg-muted animate-pulse rounded"></div>
                    <div className="h-4 w-20 bg-muted animate-pulse rounded"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold mb-1">
                      {pricing.yearly.display_per_month}
                      <span className="text-base font-normal text-muted-foreground">/{locale === 'zh' ? '月' : 'mo'}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">{pricing.yearly.display_total}/{locale === 'zh' ? '年' : 'yr'}</div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Benefits section */}
          <div className="bg-muted rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-sm text-muted-foreground">{t('payment.benefits')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5" />
                  <div className="text-sm">{benefit}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center text-sm text-muted-foreground">
              <Icons.info className="h-4 w-4 mr-2" />
              {t('payment.secure_info')}
            </div>
            
            <Button 
              className="w-full" 
              onClick={handlePayment}
              disabled={isProcessing || isLoading}
            >
              {isProcessing ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  {t('payment.processing')}
                </>
              ) : isLoading ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                <>
                  <Icons.payment className="mr-2 h-4 w-4" />
                  {selectedPlan === 'monthly' 
                    ? `${locale === 'zh' ? '月付' : 'Pay'} ${pricing.monthly.display}`
                    : `${locale === 'zh' ? '年付' : 'Pay'} ${pricing.yearly.display_total}`}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 