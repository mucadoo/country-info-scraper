import { Cheerio } from 'crawlee';
import { AnyNode, isText, isTag } from 'domhandler';

export function parseListOrLink(data: Cheerio<AnyNode>, selector: string): { text: string, articleId?: string }[] {
  const dataClone = data.clone();
  dataClone.find('sup, i, .reference').remove();
  dataClone.find('br').append(' ');

  const elements = dataClone.find(selector);
  if (elements.length > 0) {
    return elements.toArray().map((el: AnyNode) => {
      if (isTag(el)) {
        const link = el.children?.find(c => isTag(c) && c.name === 'a') as any;
        if (link) {
            const articleId = link.attribs?.href?.replace('/wiki/', '');
            return { text: link.children[0]?.data?.trim() || '', articleId };
        }
        const text = el.children?.[0];
        if (text && isText(text)) {
          return { text: text.data.trim() };
        }
      }
      return { text: '' };
    }).filter(item => item.text);
  }
  
  const single = dataClone.find('a').first();
  if (single.length > 0 && !/^\[\d+\]$/.test(single.text())) {
    const articleId = single.attr('href')?.replace('/wiki/', '');
    return [{ text: single.text().trim(), articleId }];
  }
  
  const text = dataClone.text().trim();
  return text ? [{ text }] : [];
}
