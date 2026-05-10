import { Cheerio } from 'crawlee';
import { AnyNode } from 'domhandler';

export function parseListOrLink(data: Cheerio<AnyNode>, selector: string): string {
  const dataClone = data.clone();
  dataClone.find('sup, i, .reference').remove();
  dataClone.find('br').append(' ');

  const elements = dataClone.find(selector);
  if (elements.length > 0) {
    return elements.map((_, el) => (el as any).children[0]?.data?.trim() || '').get().filter(t => t).join(', ');
  }
  const single = dataClone.find('a').first();
  if (single.length > 0 && !/^\[\d+\]$/.test(single.text())) {
    return single.text().trim();
  }
  return dataClone.text().trim();
}
