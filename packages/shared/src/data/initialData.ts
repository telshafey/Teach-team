import { SiteSettings } from '../types';

const SITE_SETTINGS: SiteSettings = {
    appName: 'Bokra Team',
    logoUrl: '/logo.svg',
    themeColor: '#0ea5e9',
    currency: 'EGP',
    overtimeRateMultiplier: 1.5,
    logEditingDaysLimit: 3,
    isFinanceModuleEnabled: true,
    isMeetingsModuleEnabled: true,
    isAnalyticsModuleEnabled: true,
    isReportsModuleEnabled: true,
    databaseSettings: {
        supabaseUrl: 'https://jmhoqsgtbgmaojryllzo.supabase.co',
        supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptaG9xc2d0YmdtYW9qcnlsbHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTE2MDYsImV4cCI6MjA3NTIyNzYwNn0.MzuQw2hWjnRfWMbr-Kbv1mkOkIfnqt_C9fyteisWrs8',
    },
    meetingSettings: {
        startWithAudioMuted: true,
        startWithVideoMuted: true,
        hideChat: false,
        hidePeople: false,
        defaultMeetingRoom: 'bokra-teamee07551d-e331-420a-82b7-95c465f44e28',
        wherebyHostRoomKey: 'https://tech-bokra.whereby.com/bokra-teamee07551d-e331-420a-82b7-95c465f44e28?roomKey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZWV0aW5nSWQiOiIxMTI2MTg2MjkiLCJyb29tUmVmZXJlbmNlIjp7InJvb21OYW1lIjoiL2Jva3JhLXRlYW1lZTA3NTUxZC1lMzMxLTQyMGEtODJiNy05NWM0NjVmNDRlMjgiLCJvcmdhbml6YXRpb25JZCI6IjMyNjg2NiJ9LCJpc3MiOiJodHRwczovL2FjY291bnRzLnNydi53aGVyZWJ5LmNvbSIsImlhdCI6MTc2MDU0NjIyOCwicm9vbUtleVR5cGUiOiJtZWV0aW5nSG9zdCJ9.T5QH1q4YQS8B-0B8ohb_QbVHVVRu-dh7PKXJIeNOWN0',
    }
};

export const initialData = {
    siteSettings: SITE_SETTINGS,
};
