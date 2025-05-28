'use client';

import { useState, useEffect } from 'react';
import { useTranslation, TranslationKey } from '@/lib/i18n';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Check } from 'lucide-react';
import { usePricing } from '@/lib/pricing-service';
import { useMembership } from '@/lib/membership-service';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import apiClient, { getApiErrorMessage } from '@/lib/api-client';

// Initialize Stripe with your publishable key
// Replace with your actual publishable key
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Helper function to safely cast keys
const asTranslationKey = (key: string): TranslationKey => key as TranslationKey;

// API endpoint
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Pricing data with benefits
const pricingBenefitsKeys = [
  "pricing.features.uploads",
  "pricing.features.char_per_file",
  "pricing.features.monthly_limit", 
  "pricing.features.file_size",
  "pricing.features.support"
] as const;

// Currency options with symbols
const currencyOptions = {
  usd: { label: 'USD ($)', symbol: '$' },
  cny: { label: 'CNY (¥)', symbol: '¥' },
  eur: { label: 'EUR (€)', symbol: '€' },
  jpy: { label: 'JPY (¥)', symbol: '¥' },
  krw: { label: 'KRW (₩)', symbol: '₩' },
  rub: { label: 'RUB (₽)', symbol: '₽' },
  gbp: { label: 'GBP (£)', symbol: '£' },
  mxn: { label: 'MXN ($)', symbol: 'Mex$' },
  ars: { label: 'ARS ($)', symbol: 'AR$' }
};

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Card component styling
const cardStyle = {
  base: {
    color: '#32325d',
    fontFamily: 'Arial, sans-serif',
    fontSmoothing: 'antialiased',
    fontSize: '16px',
    '::placeholder': {
      color: '#aab7c4',
    },
  },
  invalid: {
    color: '#fa755a',
    iconColor: '#fa755a',
  },
};

// Payment methods enum
type PaymentMethod = 'elements' | 'checkout';

// Internal Payment form component using Elements
function CheckoutForm({ 
  selectedPlan, 
  onSuccessfulPayment, 
  price,
  currency
}: { 
  selectedPlan: 'monthly' | 'yearly', 
  onSuccessfulPayment: () => void,
  price: string,
  currency: string
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState('');
  
  const stripe = useStripe();
  const elements = useElements();

  // Get payment intent from backend when selectedPlan changes
  useEffect(() => {
    const getPaymentIntent = async () => {
      try {
        const response = await apiClient.post('/api/payment/create-payment-intent', { 
          plan_type: selectedPlan,
          currency: currency
        });
        
        setClientSecret(response.data.clientSecret);
      } catch (error) {
        console.error('Error creating payment intent:', error);
        setErrorMessage(getApiErrorMessage(error));
      }
    };
    
    getPaymentIntent();
  }, [selectedPlan, currency, toast, t]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      // Stripe.js has not yet loaded.
      return;
    }
    
    setIsProcessing(true);
    setErrorMessage(null);
    
    try {
      // Get the card element
      const cardElement = elements.getElement(CardElement);
      
      if (!cardElement) {
        throw new Error('Card element not found');
      }
      
      // Confirm the payment with Stripe
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        }
      });
      
      if (error) {
        throw new Error(error.message);
      } else if (paymentIntent.status === 'succeeded') {
        // Call the membership service to finalize the purchase on the backend
        const response = await apiClient.post('/api/membership/confirm', { 
          payment_intent_id: paymentIntent.id,
          plan_type: selectedPlan 
        });
        
        toast({
          title: t('payment.success'),
          description: selectedPlan === 'monthly' 
            ? t('payment.monthly_success') 
            : t('payment.yearly_success'),
        });
        
        onSuccessfulPayment();
      }
    } catch (error) {
      console.error('Payment error:', error);
      const errorMessage = getApiErrorMessage(error);
      setErrorMessage(errorMessage);
      toast({
        title: t('payment.error'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div className="border rounded-md p-4">
          <CardElement options={{ style: cardStyle }} />
        </div>
        
        {errorMessage && (
          <div className="text-sm text-red-500">{errorMessage}</div>
        )}
        
        <Button 
          type="submit"
          className="w-full" 
          disabled={isProcessing || !stripe || !elements || !clientSecret}
        >
          {isProcessing ? (
            <>
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              {t('payment.processing')}
            </>
          ) : (
            <>
              <Icons.payment className="mr-2 h-4 w-4" />
              {t('payment.pay')} {price}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

// Checkout redirect component
function CheckoutRedirect({
  selectedPlan,
  onSuccessfulPayment,
  price,
  currency
}: {
  selectedPlan: 'monthly' | 'yearly',
  onSuccessfulPayment: () => void,
  price: string,
  currency: string
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCheckout = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    
    try {
      console.log(`Creating checkout session for plan: ${selectedPlan}`);
      
      // Create a checkout session
      const response = await apiClient.post('/api/payment/checkout-session', { 
        plan_type: selectedPlan,
        currency: currency,
        success_url: `${window.location.origin}/payment/success`,
        cancel_url: `${window.location.origin}/payment/cancel`
      });
      
      console.log(`Checkout response status: ${response.status}`);
      
      // Redirect to Stripe Checkout
      window.location.href = response.data.url;
    } catch (error: any) {
      console.error('Checkout error:', error);
      
      const errorMessage = getApiErrorMessage(error);
      
      setErrorMessage(errorMessage);
      toast({
        title: t('payment.error'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="text-sm text-red-500">{errorMessage}</div>
      )}
      
      <Button 
        className="w-full" 
        onClick={handleCheckout}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <>
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            {t('payment.processing')}
          </>
        ) : (
          <>
            <Icons.payment className="mr-2 h-4 w-4" />
            {t('payment.pay')} {price}
          </>
        )}
      </Button>
    </div>
  );
}

export function PaymentModal({ isOpen, onClose, onSuccess }: PaymentModalProps) {
  const { t, locale } = useTranslation();
  const { pricing, isLoading, updateCurrency } = usePricing();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('checkout');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const [characterLimit, setCharacterLimit] = useState<number>(5000000); // Default value until fetched

  // Fetch character limit from backend
  useEffect(() => {
    const fetchCharacterLimit = async () => {
      try {
        const response = await apiClient.get('/api/config/character-limit');
        setCharacterLimit(response.data.character_limit);
      } catch (error) {
        console.error('Error fetching character limit:', error);
      }
    };
    
    fetchCharacterLimit();
  }, []);

  // Get benefits using translation system
  const benefits = pricingBenefitsKeys.map(key => {
    // Use the paid plan features from translations
    if (key === "pricing.features.uploads") return t('pricing.features.upload_limit') + ": " + t('pricing.no_limit');
    if (key === "pricing.features.char_per_file") return t('pricing.features.char_per_file') + ": " + t('pricing.no_limit');
    if (key === "pricing.features.monthly_limit") return t('pricing.features.monthly_limit') + ": " + characterLimit;
    if (key === "pricing.features.file_size") return t('pricing.features.file_size') + ": " + t('pricing.no_limit');
    if (key === "pricing.features.support") return t('pricing.features.support') + ": " + t('pricing.paid_customer_email_support');
    return t(asTranslationKey(key));
  });

  // Initialize selected currency based on locale
  useEffect(() => {
    if (!selectedCurrency) {
      let defaultCurrency = 'usd';
      
      // Map locale to default currency
      switch (locale) {
        case 'zh': defaultCurrency = 'cny'; break;
        case 'es': defaultCurrency = 'eur'; break;
        case 'fr': defaultCurrency = 'eur'; break;
        case 'de': defaultCurrency = 'eur'; break;
        case 'ja': defaultCurrency = 'jpy'; break;
        case 'ko': defaultCurrency = 'krw'; break;
        case 'ru': defaultCurrency = 'rub'; break;
        default: defaultCurrency = 'usd';
      }
      
      setSelectedCurrency(defaultCurrency);
      updateCurrency(defaultCurrency);
    }
  }, [locale, selectedCurrency, updateCurrency]);

  // Handle currency change
  const handleCurrencyChange = (currency: string) => {
    setSelectedCurrency(currency);
    updateCurrency(currency);
  };

  const handleSuccessfulPayment = () => {
    // Call the onSuccess callback if provided
    if (onSuccess) {
      onSuccess();
    }
    // Close modal on success
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{t('payment.title')}</DialogTitle>
          <DialogDescription>{t('payment.subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Currency selector */}
          <div className="flex justify-end">
            <Select value={selectedCurrency} onValueChange={handleCurrencyChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('payment.currency')} />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(currencyOptions).map(([value, { label }]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
                    <span className="text-base font-normal text-muted-foreground">/{t(asTranslationKey('payment.month_abbr'), { defaultValue: 'mo' })}</span>
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
                      <span className="text-base font-normal text-muted-foreground">/{t(asTranslationKey('payment.month_abbr'), { defaultValue: 'mo' })}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">{pricing.yearly.display_total}/{t(asTranslationKey('payment.year_abbr'), { defaultValue: 'yr' })}</div>
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
            
            {/* Payment option tabs - uncomment to enable both payment methods
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Button 
                variant={paymentMethod === 'elements' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('elements')}
                className="w-full"
              >
                Card Payment
              </Button>
              <Button 
                variant={paymentMethod === 'checkout' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('checkout')}
                className="w-full"
              >
                Checkout
              </Button>
            </div>
            */}
            
            {paymentMethod === 'elements' ? (
              <Elements stripe={stripePromise}>
                <CheckoutForm 
                  selectedPlan={selectedPlan} 
                  onSuccessfulPayment={handleSuccessfulPayment} 
                  price={selectedPlan === 'monthly' ? pricing.monthly.display : pricing.yearly.display_total}
                  currency={selectedCurrency}
                />
              </Elements>
            ) : (
              <CheckoutRedirect
                selectedPlan={selectedPlan}
                onSuccessfulPayment={handleSuccessfulPayment}
                price={selectedPlan === 'monthly' ? pricing.monthly.display : pricing.yearly.display_total}
                currency={selectedCurrency}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 