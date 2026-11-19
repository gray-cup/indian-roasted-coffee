import { siteConfig } from '../config/site';
import { telHref, useTranslations } from '../i18n/utils';
import { getProductPackOptions, type PackPrice } from './pricing';

export const SITE_ORIGIN = `https://${siteConfig.domain}`;
export const DEFAULT_OG_IMAGE = '/og-default.jpg';

const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Absolute URL for a site-relative path, including BASE_PATH on subpath deploys. */
export function absUrl(path: string): string {
  return /^https?:\/\//.test(path) ? path : `${SITE_ORIGIN}${BASE_PATH}${path}`;
}

export function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > 0 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

export function graph(...nodes: object[]) {
  return { '@context': 'https://schema.org', '@graph': nodes };
}

export function organizationSchema() {
  const t = useTranslations('en');
  return {
    '@type': 'Organization',
    '@id': absUrl('/#organization'),
    name: siteConfig.name,
    url: absUrl('/'),
    logo: absUrl('/logo-512.png'),
    email: t('footer.email'),
    telephone: telHref(t('footer.phone')).replace(/^tel:/, ''),
    parentOrganization: { '@type': 'Organization', name: 'Gray Cup Enterprises Private Limited' },
    sameAs: ['https://graycup.com', 'https://graycup.in', 'https://graycup.org'],
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absUrl(item.path),
    })),
  };
}

export function itemListSchema(items: { name: string; path: string }[]) {
  return {
    '@type': 'ItemList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      url: absUrl(item.path),
    })),
  };
}

export function productSchema(p: {
  path: string;
  name: string;
  description: string;
  image?: string;
  inStock: boolean;
  priceMultiplier: number;
  packPricing?: PackPrice[];
}) {
  const prices = getProductPackOptions(p.priceMultiplier, p.packPricing).map((o) => o.priceInr);
  return {
    '@type': 'Product',
    name: p.name,
    description: p.description,
    url: absUrl(p.path),
    ...(p.image && { image: absUrl(p.image) }),
    brand: { '@type': 'Brand', name: siteConfig.name },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'INR',
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: prices.length,
      availability: `https://schema.org/${p.inStock ? 'InStock' : 'OutOfStock'}`,
    },
  };
}

export function faqPageSchema(items: { question: string; answerHtml: string }[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: { '@type': 'Answer', text: q.answerHtml },
    })),
  };
}
