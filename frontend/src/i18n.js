import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// English translations
const enTranslation = {
  nav: {
    dashboard: 'Dashboard',
    contactscrm: 'Contacts CRM',
    inbox: 'Inbox',
    aiagents: 'AI Agents',
    socialai: 'Social AI',
    flowbuilder: 'Flow Builder',
    keywordtriggers: 'Keyword Triggers',
    templates: 'Templates',
    broadcasts: 'Broadcasts',
    campaigns: 'Campaigns',
    analytics: 'Analytics',
    integrations: 'Integrations',
    billing: 'Billing',
    settings: 'Settings'
  },
  header: {
    welcome: 'Welcome back',
    search: 'Search...',
    language: 'Language'
  }
};

// Hindi translations
const hiTranslation = {
  nav: {
    dashboard: 'डैशबोर्ड',
    contactscrm: 'संपर्क सीआरएम',
    inbox: 'इनबॉक्स',
    aiagents: 'एआई एजेंट',
    socialai: 'सोशल एआई',
    flowbuilder: 'फ्लो बिल्डर',
    keywordtriggers: 'कीवर्ड ट्रिगर',
    templates: 'टेम्पलेट्स',
    broadcasts: 'प्रसारण',
    campaigns: 'अभियान',
    analytics: 'एनालिटिक्स',
    integrations: 'एकीकरण',
    billing: 'बिलिंग',
    settings: 'सेटिंग्स'
  },
  header: {
    welcome: 'वापसी पर स्वागत है',
    search: 'खोजें...',
    language: 'भाषा'
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      hi: { translation: hiTranslation }
    },
    lng: localStorage.getItem('language') || 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
