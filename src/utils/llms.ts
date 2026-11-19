import { getCollection } from 'astro:content';
import { siteConfig } from '../config/site';
import { idToSlug } from './content';
import { getProductPackOptions } from './pricing';
import { absUrl } from './seo';

const PAGES = [
  ['FAQ', '/faq/'],
  ['Wholesale', '/wholesale/'],
  ['About', '/about/'],
  ['Contact', '/contact/'],
  ['Returns & refunds', '/returns/'],
  ['Terms and conditions', '/terms/'],
  ['Privacy policy', '/privacy/'],
];

async function products() {
  return (await getCollection('services', ({ data }) => !data.draft))
    .sort((a, b) => a.data.order - b.data.order);
}

export async function buildLlmsTxt(): Promise<string> {
  const lines = [`# ${siteConfig.name}`, '', `> ${siteConfig.description}`, '', '## Coffees', ''];
  for (const p of await products()) {
    lines.push(`- [${p.data.title}](${absUrl(`/products/${idToSlug(p.id)}/`)}): ${p.data.summary}`);
  }
  lines.push('', '## Pages', '');
  for (const [name, path] of PAGES) lines.push(`- [${name}](${absUrl(path)})`);
  lines.push('', '## Optional', '');
  lines.push(`- [Full product details and FAQ](${absUrl('/llms-full.txt')})`);
  lines.push(`- [Product catalogue (JSON)](${absUrl('/products.json')})`);
  return lines.join('\n') + '\n';
}

export async function buildLlmsFullTxt(): Promise<string> {
  const lines = [`# ${siteConfig.name}`, '', `> ${siteConfig.description}`, ''];
  for (const p of await products()) {
    lines.push(`## ${p.data.title}`, '', `URL: ${absUrl(`/products/${idToSlug(p.id)}/`)}`, '', p.data.description, '');
    for (const f of [...p.data.eligibility, ...p.data.keyFacts]) lines.push(`- ${f.label}: ${f.value}`);
    lines.push('', 'Prices (INR):', '');
    for (const o of getProductPackOptions(p.data.priceMultiplier, p.data.packPricing)) {
      lines.push(`- ${o.label}: ₹${o.priceInr.toLocaleString('en-IN')}`);
    }
    lines.push('', p.body ?? '', '');
  }
  lines.push('## FAQ', '');
  const faqs = (await getCollection('faqs', ({ data }) => !data.draft)).sort((a, b) => a.data.order - b.data.order);
  for (const f of faqs) lines.push(`### ${f.data.question}`, '', f.body ?? '', '');
  return lines.join('\n');
}
