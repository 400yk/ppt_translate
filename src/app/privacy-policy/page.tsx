'use client';

import { useTranslation } from '@/lib/i18n';
import { DynamicHead } from '@/components/dynamic-head';
import Link from 'next/link';
import Image from 'next/image';
import LogoImage from '@/assets/Pure_logo.png';

export default function PrivacyPolicyPage() {
  const { t } = useTranslation();
  const lastUpdatedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'Translide';

  return (
    <div className="flex flex-col min-h-screen">
      <DynamicHead />
      {/* Navbar */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Image src={LogoImage} alt={t('title')} width={40} height={40} />
              <span className="text-2xl font-bold">{t('title')}</span>
            </Link>
            <Link href="/" className="text-foreground hover:text-primary transition">
              {t('nav.home')}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">{t('landing.privacy_policy')}</h1>
        <p className="text-sm text-muted-foreground mb-8">{t('privacy.last_updated', { date: lastUpdatedDate })}</p>
        
        <div className="prose max-w-none space-y-6">
          <p className="text-base leading-relaxed">
            {t('privacy.intro', { site: siteOrigin })}
          </p>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8 mb-4">{t('privacy.personal_info_collect')}</h2>
            <p className="text-base leading-relaxed mb-4">
              {t('privacy.device_info_desc')}
            </p>

            <p className="text-base leading-relaxed mb-4">{t('privacy.collect_tech_intro')}</p>
            <ul className="space-y-2 mb-4">
              <li>{t('privacy.cookies_desc')}</li>
              <li>{t('privacy.log_files_desc')}</li>
              <li>{t('privacy.web_beacons_desc')}</li>
            </ul>

            <p className="text-base leading-relaxed mb-4">
              {t('privacy.provided_info_desc')}
            </p>

            <p className="text-base leading-relaxed mb-4">
              {t('privacy.personal_info_definition')}
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8 mb-4">{t('privacy.how_we_use')}</h2>
            <p className="text-base leading-relaxed mb-4">
              {t('privacy.how_we_use_desc')}
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8 mb-4">{t('privacy.sharing_info')}</h2>
            <p className="text-base leading-relaxed mb-4">
              {t('privacy.google_analytics_desc')}
            </p>
            
            <p className="text-base leading-relaxed mb-4">{t('privacy.third_party_policies')}</p>
            <ul className="space-y-2 mb-4">
              <li><a href="#Longway-privacy">{t('privacy.longway_services')} (see below)</a></li>
              <li><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google Services Privacy Policy</a> and <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">Google Services Terms of Service</a></li>
            </ul>

            <h3 id="Longway-privacy" className="text-xl font-semibold mt-6 mb-3">{t('privacy.longway_services')}</h3>
            <p className="text-base leading-relaxed mb-4">
              {t('privacy.longway_contract_desc')}
            </p>
            <p className="text-base leading-relaxed mb-4">
              {t('privacy.cookie_definition')}
            </p>
            <ul className="space-y-1 mb-4">
              {t('privacy.cookie_info_collected').split(';').map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
            <p className="text-base leading-relaxed mb-4">
              {t('privacy.longway_data_usage')}
            </p>
            <p className="text-base leading-relaxed mb-4">
              {t('privacy.longway_privacy_links')}
            </p>

            <p className="text-base leading-relaxed mb-4">
              {t('privacy.legal_sharing')}
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8 mb-4">{t('privacy.behavioral_advertising')}</h2>
            <p className="text-base leading-relaxed mb-4">
              {t('privacy.behavioral_desc')}
            </p>

            <p className="text-base leading-relaxed mb-4">{t('privacy.opt_out_intro')}</p>

            <p className="text-base leading-relaxed mb-4">
              {t('privacy.opt_out_additional')}
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8 mb-4">{t('privacy.do_not_track')}</h2>
            <p className="text-base leading-relaxed mb-4">
              {t('privacy.do_not_track_desc')}
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8 mb-4">{t('privacy.your_rights')}</h2>
            <p className="text-base leading-relaxed mb-4">
              {t('privacy.eu_rights_desc')}
            </p>
            <p className="text-base leading-relaxed mb-4">
              {t('privacy.eu_processing_desc')}
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8 mb-4">{t('privacy.data_retention')}</h2>
            <p className="text-base leading-relaxed mb-4">
              {t('privacy.data_deletion_desc')}
            </p>
            <p className="text-base leading-relaxed mb-4">
              {t('privacy.google_services_desc')}
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8 mb-4">{t('privacy.minors')}</h2>
            <p className="text-base leading-relaxed mb-4">{t('privacy.minors_desc')}</p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8 mb-4">{t('privacy.changes')}</h2>
            <p className="text-base leading-relaxed mb-4">
              {t('privacy.changes_desc')}
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8 mb-4">{t('privacy.contact_us')}</h2>
            <p className="text-base leading-relaxed mb-4">
              {t('privacy.contact_desc')}
            </p>
          </div>
        </div>
      </main>

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