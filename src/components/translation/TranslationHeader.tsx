import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { LanguageSelector } from '@/components/language-selector';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n';
import LogoImage from '@/assets/Pure_logo.png';

interface TranslationHeaderProps {
  isGuestUser: boolean;
  onShowRegistrationDialog: () => void;
}

export function TranslationHeader({ isGuestUser, onShowRegistrationDialog }: TranslationHeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  
  // Custom logout function to redirect to landing page
  const handleLogout = () => {
    logout(() => {
      router.push('/');
    });
  };

  // Get translated texts for the dropdown menu
  const guestUserText = t('guest.guest_user');
  const registerLoginText = t('auth.register_login');
  const backToHomeText = t('auth.back_to_home');
  
  return (
    <div className="w-full flex justify-between items-center py-2">
      <div className="flex items-center">
        <Link href="/">
          <div className="flex items-center">
            <Image
              src={LogoImage}
              alt={t('title')} 
              width={40}
              height={40}
              className="mr-2"
            />
            <h1 className="text-2xl font-bold">{t('title')}</h1>
          </div>
        </Link>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Language selector */}
        <LanguageSelector width="w-[100px]" />
        
        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Icons.user className="h-4 w-4" />
              <span className="hidden sm:inline-block">{user?.username || guestUserText}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isGuestUser ? (
              <>
                <DropdownMenuLabel>{guestUserText}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onShowRegistrationDialog}>
                  <Icons.user className="mr-2 h-4 w-4" />
                  {registerLoginText}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/')}>
                  <Icons.home className="mr-2 h-4 w-4" />
                  {backToHomeText}
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuLabel>{user?.email || user?.username}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/profile')}>
                  <Icons.user className="mr-2 h-4 w-4" />
                  {t('profile.title')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <Icons.logout className="mr-2 h-4 w-4" />
                  {t('auth.logout')}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
} 