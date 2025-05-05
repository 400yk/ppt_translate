'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n';
import LogoImage from '@/assets/Pure_logo.png';
import Link from 'next/link';
import { Icons } from '@/components/icons';

// File format icons
import { FileText, FileImage, FileVideo, FileAudio, CreditCard } from 'lucide-react';
import TextLogo from '@/assets/text_logo.png';
import TableLogo from '@/assets/table_logo.png';
import StyleLogo from '@/assets/style_logo.png';

export default function LandingPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();
  const [isClient, setIsClient] = useState(false);

  // Fix for hydration error - only render content after client-side mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleGetStarted = () => {
    if (isAuthenticated) {
      router.push('/translate'); // Go to translation page
    } else {
      router.push('/auth'); // Go to login page
    }
  };

  if (!isClient) {
    return <div className="min-h-screen"></div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Image src={LogoImage} alt="Translide Logo" width={40} height={40} />
              <span className="text-2xl font-bold">Translide</span>
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

      {/* Hero Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-primary/20 to-background">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="mr-2">Translate</span>
              <span className="text-orange-500">PowerPoint</span>
              <span className="block mt-2">with Translide AI</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-16">
              One-click translation for your PowerPoint in any language.
            </p>
            <Button 
              onClick={handleGetStarted} 
              size="lg" 
              className="rounded-full px-8 py-6 text-lg bg-teal-600 hover:bg-teal-700 text-white"
            >
              Get Started For Free
              <Icons.arrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
          
        </div>
      </section>

      {/* Features Section */}
      <section className="pt-0 pb-16 bg-background">
        <div className="container mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            The simplest way to translate your PowerPoint
          </h2>
          
          <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Text Translator */}
            <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition">
              <div className="bg-primary/20 p-2 rounded-md w-fit mb-4 flex items-center justify-center">
                <Image src={TextLogo} alt="Text" width={36} height={36} />
              </div>
              <h3 className="text-xl font-bold mb-2">Texts</h3>
              <p className="text-muted-foreground">
                Converts text into multiple languages while preserving textbox layout.
              </p>
            </div>
            
            {/* Table Translator */}
            <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition">
              <div className="bg-primary/20 p-2 rounded-md w-fit mb-4 flex items-center justify-center">
                <Image src={TableLogo} alt="Table" width={36} height={36} />
              </div>
              <h3 className="text-xl font-bold mb-2">Tables</h3>
              <p className="text-muted-foreground">
                Extract and translate text from tables while maintaining table layout.
              </p>
            </div>
            
            {/* Style Translator */}
            <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition">
              <div className="bg-primary/20 p-2 rounded-md w-fit mb-4 flex items-center justify-center">
                <Image src={StyleLogo} alt="Style" width={36} height={36} />
              </div>
              <h3 className="text-xl font-bold mb-2">Styles</h3>
              <p className="text-muted-foreground">
                Keep the style of your PowerPoint slides same as original.
              </p>
            </div>
          </div>
          
          <div className="text-center mt-16">
            <Button onClick={() => router.push('/pricing')} variant="outline" className="rounded-full px-8 border-teal-600 text-teal-600 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-700">
              View Pricing Plans
              <CreditCard className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>
      
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