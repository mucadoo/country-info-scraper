import { Cheerio } from 'crawlee';
import { AnyNode, isTag, isText } from 'domhandler';

export function parseCurrency(data: Cheerio<AnyNode>): string {
  const dataClone = data.clone();
  dataClone.find('sup, i, br, .reference').remove();
  const links = dataClone.find('.plainlist ul li a, a');
  if (links.length > 0) {
    return links.toArray().map((l: AnyNode) => {
      if (isTag(l)) {
        const title = l.attribs?.title || '';
        if (title.toLowerCase() === 'iso 4217') return '';
        const firstChild = l.children[0];
        if (firstChild && isText(firstChild)) {
          return firstChild.data.split('(')[0].trim();
        }
      }
      return '';
    }).filter(t => t).join(', ');
  }
  return dataClone.text().split('(')[0].trim();
}
