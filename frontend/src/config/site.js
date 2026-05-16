const defaultOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://runadvisor.fit';

export const siteConfig = {
  appName: 'RunAdvisor',
  siteUrl: process.env.REACT_APP_SITE_URL || defaultOrigin,
  contactEmail: process.env.REACT_APP_CONTACT_EMAIL || 'support@runadvisor.fit',
  contactName: process.env.REACT_APP_CONTACT_NAME || 'RunAdvisor Support',
  privacyEmail: process.env.REACT_APP_PRIVACY_EMAIL || process.env.REACT_APP_CONTACT_EMAIL || 'privacy@runadvisor.fit',
  lastUpdated: 'May 2026'
};

export const stravaLegalLinks = {
  apiAgreement: 'https://www.strava.com/legal/api',
  privacy: 'https://www.strava.com/legal/privacy',
  settings: 'https://www.strava.com/settings/apps'
};
