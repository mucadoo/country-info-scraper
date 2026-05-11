import { Cheerio } from 'crawlee';
import { AnyNode, isText, isTag } from 'domhandler';

export function parseListOrLink(data: Cheerio<AnyNode>, selector: string): string {
  const dataClone = data.clone();
  dataClone.find('sup, i, .reference').remove();
  dataClone.find('br').append(' ');

  const elements = dataClone.find(selector);
  if (elements.length > 0) {
    return elements.toArray().map((el: AnyNode) => {
      if (isTag(el)) {
        const firstChild = el.children?.[0];
        if (firstChild && isText(firstChild)) {
          return firstChild.data.trim();
        }
      }
      return '';
    }).filter(t => t).join(', ');
  }
  const single = dataClone.find('a').first();
  if (single.length > 0 && !/^\[\d+\]$/.test(single.text())) {
    return single.text().trim();
  }
  return dataClone.text().trim();
}
