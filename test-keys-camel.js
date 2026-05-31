const snakeToCamel = (str) => str.replace(/([-_][a-z])/g, (group) => group.toUpperCase().replace('-', '').replace('_', ''));
const keysToCamel = (obj) => {
    if (Array.isArray(obj)) {
        return obj.map(v => keysToCamel(v));
    } else if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            acc[snakeToCamel(key)] = keysToCamel(obj[key]);
            return acc;
        }, {});
    }
    return obj;
};

const settings = {
  id: '1',
  app_name: 'Bokra Team',
  logo_url: null,
  theme_color: '#0ea5e9',
  currency: 'EGP',
  overtime_rate_multiplier: 1.3,
  log_editing_days_limit: 3,
  is_finance_module_enabled: true,
  is_meetings_module_enabled: true,
  is_analytics_module_enabled: true,
  is_reports_module_enabled: true,
  meeting_settings: {
    hide_chat: false,
    hide_people: false,
    default_meeting_room: 'test',
    whereby_host_room_key: 'test',
    start_with_audio_muted: true,
    start_with_video_muted: true
  }
};
console.log(keysToCamel(settings));
