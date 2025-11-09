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
import arIntegrations from './locales/ar/integrations.json';
import arExpenses from './locales/ar/expenses.json';
import arInbox from './locales/ar/inbox.json';
import arConflicts from './locales/ar/conflicts.json';
import arProjects from './locales/ar/projects.json';
import arAi from './locales/ar/ai.json';
import arProfile from './locales/ar/profile.json';

import enCommon from './locales/en/common.json';
import enNavigation from './locales/en/navigation.json';
import enAuth from './locales/en/auth.json';
import enToday from './locales/en/today.json';
import enCalendar from './locales/en/calendar.json';
import enSettings from './locales/en/settings.json';
import enPlans from './locales/en/plans.json';
import enReports from './locales/en/reports.json';
import enIntegrations from './locales/en/integrations.json';
import enExpenses from './locales/en/expenses.json';
import enInbox from './locales/en/inbox.json';
import enConflicts from './locales/en/conflicts.json';
import enProjects from './locales/en/projects.json';
import enAi from './locales/en/ai.json';
import enProfile from './locales/en/profile.json';

import esCommon from './locales/es/common.json';
import esNavigation from './locales/es/navigation.json';
import esAuth from './locales/es/auth.json';
import esToday from './locales/es/today.json';
import esCalendar from './locales/es/calendar.json';
import esSettings from './locales/es/settings.json';
import esPlans from './locales/es/plans.json';
import esReports from './locales/es/reports.json';
import esIntegrations from './locales/es/integrations.json';
import esExpenses from './locales/es/expenses.json';
import esInbox from './locales/es/inbox.json';
import esConflicts from './locales/es/conflicts.json';
import esProjects from './locales/es/projects.json';
import esAi from './locales/es/ai.json';
import esProfile from './locales/es/profile.json';

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
    integrations: arIntegrations,
    expenses: arExpenses,
    inbox: arInbox,
    conflicts: arConflicts,
    projects: arProjects,
    ai: arAi,
    profile: arProfile,
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
    integrations: enIntegrations,
    expenses: enExpenses,
    inbox: enInbox,
    conflicts: enConflicts,
    projects: enProjects,
    ai: enAi,
    profile: enProfile,
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
    integrations: esIntegrations,
    expenses: esExpenses,
    inbox: esInbox,
    conflicts: esConflicts,
    projects: esProjects,
    ai: esAi,
    profile: esProfile,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'navigation', 'auth', 'today', 'calendar', 'settings', 'plans', 'reports', 'integrations', 'expenses', 'inbox', 'conflicts', 'projects', 'ai', 'profile'],
    
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

// Apply language and direction attributes on language change
i18n.on('languageChanged', (lng) => {
  document.documentElement.setAttribute('lang', lng);
  
  // Persist to localStorage as backup
  localStorage.setItem('i18nextLng', lng);
  
  // Emit custom event for components that need to know about language change
  window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lng } }));
});

export default i18n;
