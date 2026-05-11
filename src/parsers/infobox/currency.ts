import { Cheerio } from 'crawlee';
import { AnyNode, isTag, isText } from 'domhandler';

export function parseCurrency(data: Cheerio<AnyNode>): { text: string, articleId?: string }[] {
  const dataClone = data.clone();
  dataClone.find('sup, i, br, .reference').remove();
  const links = dataClone.find('.plainlist ul li a, a');
  if (links.length > 0) {
    return links.toArray().map((l: AnyNode) => {
      if (isTag(l)) {
        const title = l.attribs?.title || '';
        if (title.toLowerCase() === 'iso 4217') return { text: '' };
        const rawHref = l.attribs?.href || '';
        const articleId = rawHref.startsWith('/wiki/') 
          ? decodeURIComponent(rawHref.replace('/wiki/', '').replace(/_/g, ' ')) 
          : rawHref;
        const firstChild = l.children[0];
        if (firstChild && isText(firstChild)) {
          return { text: firstChild.data.split('(')[0].trim(), articleId };
        }
      }
      return { text: '' };
    }).filter(item => item.text);
  }
  const text = dataClone.text().split('(')[0].trim();
  return text ? [{ text }] : [];
}
