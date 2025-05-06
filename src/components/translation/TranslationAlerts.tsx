import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { useTranslation } from "@/lib/i18n";

interface GuestAlertProps {
  isVisible: boolean;
}

export function GuestAlert({ isVisible }: GuestAlertProps) {
  const { t } = useTranslation();
  
  if (!isVisible) return null;
  
  return (
    <Alert className="border-teal-500 bg-teal-50 w-full mb-8">
      <Icons.info className="h-4 w-4 text-teal-500" />
      <AlertTitle className="text-teal-700">{t('guest.free_trial')}</AlertTitle>
      <AlertDescription className="text-teal-600">
        {t('guest.free_trial_desc')}
        <span className="block mt-1 font-medium">
          {t('guest.one_time_note')}
        </span>
      </AlertDescription>
    </Alert>
  );
}

interface WeeklyLimitAlertProps {
  isVisible: boolean;
  isGuestUser: boolean;
  onAction: () => void;
}

export function WeeklyLimitAlert({ isVisible, isGuestUser, onAction }: WeeklyLimitAlertProps) {
  const { t } = useTranslation();
  
  if (!isVisible) return null;
  
  return (
    <Alert className="border-amber-500 bg-amber-50 w-full mb-8">
      <Icons.info className="h-4 w-4 text-amber-500" />
      <AlertTitle className="text-amber-700">
        {isGuestUser ? t('guest.trial_used') : t('pricing.weekly_limit_title')}
      </AlertTitle>
      <AlertDescription className="text-amber-600 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <span>
          {isGuestUser ? t('guest.register_prompt') : t('pricing.weekly_limit_message')}
        </span>
        <Button 
          variant="outline" 
          className="border-amber-500 text-amber-700 hover:bg-amber-200 hover:text-amber-900 shrink-0"
          onClick={onAction}
        >
          {isGuestUser ? t('auth.register_login') : t('buttons.upgrade')}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

interface FileSizeAlertProps {
  isVisible: boolean;
  maxFileSizeMB: number;
  onUpgrade: () => void;
}

export function FileSizeAlert({ isVisible, maxFileSizeMB, onUpgrade }: FileSizeAlertProps) {
  const { t } = useTranslation();
  
  if (!isVisible) return null;
  
  return (
    <Alert className="border-amber-500 bg-amber-50 w-full mb-8">
      <Icons.info className="h-4 w-4 text-amber-500" />
      <AlertTitle className="text-amber-700">{t('errors.file_size_limit')}</AlertTitle>
      <AlertDescription className="text-amber-600 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <span>{t('errors.file_size_exceeded', { size: maxFileSizeMB })}</span>
        <Button 
          variant="outline" 
          className="border-amber-500 text-amber-700 hover:bg-amber-200 hover:text-amber-900 shrink-0"
          onClick={onUpgrade}
        >
          {t('buttons.upgrade')}
        </Button>
      </AlertDescription>
    </Alert>
  );
} 