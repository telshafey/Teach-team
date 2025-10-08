import { SiteSettings } from '../types';

const SITE_SETTINGS: SiteSettings = {
    appName: 'Bokra Team',
    logoUrl: '/logo.svg',
    themeColor: '#0ea5e9',
    currency: 'EGP',
    overtimeRateMultiplier: 1.5,
    isFinanceModuleEnabled: true,
    isMeetingsModuleEnabled: true,
    isAnalyticsModuleEnabled: true,
    isReportsModuleEnabled: true,
    databaseSettings: {
        supabaseUrl: 'https://jmhoqsgtbgmaojryllzo.supabase.co',
        supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptaG9xc2d0YmdtYW9qcnlsbHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTE2MDYsImV4cCI6MjA3NTIyNzYwNn0.MzuQw2hWjnRfWMbr-Kbv1mkOkIfnqt_C9fyteisWrs8',
    }
};

export const initialData = {
    siteSettings: SITE_SETTINGS,
};