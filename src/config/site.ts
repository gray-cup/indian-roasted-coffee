export const siteConfig = {
  name: 'Indian Roasted Coffee',
  shortName: 'IRC',
  domain: 'indianroastedcoffee.com',
  description: 'Premium single-origin Indian coffee beans, roasted to order and shipped within 48 hours. Sourced from Coorg, Chikmagalur, Wayanad, and the Nilgiris.',
  locale: 'en-IN',

  links: {
    about: '/about/',
    accessibility: '/accessibility/',
    foia: '/shipping/',
    noFear: '/returns/',
    oig: '/sustainability/',
    privacy: '/privacy/',
    budget: '/certifications/',
    usagov: 'https://coffeeboard.gov.in/',
  },
} as const;

export type SiteConfig = typeof siteConfig;
