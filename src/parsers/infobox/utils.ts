import { Cheerio } from 'crawlee';
import { AnyNode, isText, isTag } from 'domhandler';

export function parseListOrLink(data: Cheerio<AnyNode>, selector: string): { text: string, articleId?: string }[] {
  const dataClone = data.clone();
  dataClone.find('sup, i, .reference').remove();
  dataClone.find('br').append(' ');

  let elements: Cheerio<AnyNode> = dataClone.find(selector);
  if (elements.length === 0 && data.is(selector)) {
    elements = dataClone;
  }

  if (elements.length > 0) {
    return elements.toArray().map((el: AnyNode) => {
      if (isTag(el)) {
        const link = el.name === 'a' ? el : el.children?.find(c => isTag(c) && c.name === 'a') as any;
        if (link) {
            const href = link.attribs?.href || '';
            const articleId = href.startsWith('/wiki/') ? href.replace('/wiki/', '') : href;
            const text = link.children[0]?.data?.trim() || el.attribs?.title || '';
            return { text, articleId };
        }
        const text = (el as any).children?.[0];
        if (text && isText(text)) {
          return { text: text.data.trim() };
        }
      }
      return { text: '' };
    }).filter(item => item.text);
  }
  
  const single = dataClone.find('a').first();
  if (single.length > 0 && !/^\[\d+\]$/.test(single.text())) {
    const href = single.attr('href') || '';
    const articleId = href.startsWith('/wiki/') 
      ? href.replace('/wiki/', '')
      : href;
    return [{ text: single.text().trim(), articleId }];
  }
  
  const text = dataClone.text().trim();
  return text ? [{ text }] : [];
}
