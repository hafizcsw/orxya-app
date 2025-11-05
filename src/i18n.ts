import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import all translation files
import arCommon from './locales/ar/common.json';
import arNavigation from './locales/ar/navigation.json';
import arAuth from './locales/ar/auth.json';
import arToday from './locales/ar/today.json';
import arCalendar from './locales/ar/calendar.json';
import arSettings from './locales/ar/settings.json';
import arPlans from './locales/ar/plans.json';
import arReports from './locales/ar/reports.json';

import enCommon from './locales/en/common.json';
import enNavigation from './locales/en/navigation.json';
import enAuth from './locales/en/auth.json';
import enToday from './locales/en/today.json';
import enCalendar from './locales/en/calendar.json';
import enSettings from './locales/en/settings.json';
import enPlans from './locales/en/plans.json';
import enReports from './locales/en/reports.json';

import esCommon from './locales/es/common.json';
import esNavigation from './locales/es/navigation.json';
import esAuth from './locales/es/auth.json';
import esToday from './locales/es/today.json';
import esCalendar from './locales/es/calendar.json';
import esSettings from './locales/es/settings.json';
import esPlans from './locales/es/plans.json';
import esReports from './locales/es/reports.json';

const resources = {
  ar: {
    common: arCommon,
    navigation: arNavigation,
    auth: arAuth,
    today: arToday,
    calendar: arCalendar,
    settings: arSettings,
    plans: arPlans,
    reports: arReports,
  },
  en: {
    common: enCommon,
    navigation: enNavigation,
    auth: enAuth,
    today: enToday,
    calendar: enCalendar,
    settings: enSettings,
    plans: enPlans,
    reports: enReports,
  },
  es: {
    common: esCommon,
    navigation: esNavigation,
    auth: esAuth,
    today: esToday,
    calendar: esCalendar,
    settings: esSettings,
    plans: esPlans,
    reports: esReports,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ar',
    defaultNS: 'common',
    ns: ['common', 'navigation', 'auth', 'today', 'calendar', 'settings', 'plans', 'reports'],
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: false,
    },
  });

// Apply RTL/LTR based on language
i18n.on('languageChanged', (lng) => {
  const dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lng);
});

export default i18n;
