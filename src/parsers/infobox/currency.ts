import { Cheerio } from 'crawlee';
import { AnyNode } from 'domhandler';

export function parseCurrency(data: Cheerio<AnyNode>): string {
  const dataClone = data.clone();
  dataClone.find('sup, i, br, .reference').remove();
  const links = dataClone.find('.plainlist ul li a, a');
  if (links.length > 0) {
    return links.map((_, l) => {
      const title = (l as any).attribs?.title || '';
      if (title.toLowerCase() === 'iso 4217') return '';
      return (l as any).children[0]?.data?.split('(')[0].trim() || '';
    }).get().filter(t => t).join(', ');
  }
  return dataClone.text().split('(')[0].trim();
}
