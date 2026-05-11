import { Cheerio } from 'crawlee';
import { AnyNode } from 'domhandler';

export class ExtractionUtils {
  static cleanText($: Cheerio<AnyNode>): string {
    if (!$) return '';
    const clone = $.clone();
    // Remove footnotes, references, coordinates, and other non-textual elements
    clone.find('sup, .reference, .geo-inline, .geo-default, .geo-dms, .geo-dec, .geo, span.plainlinks, style, .screenreader-only, .smallsup, .as_of').remove();

    // Normalize spaces and remove hidden Unicode markers
    return clone.text()
      .replace(/[\s\u00A0]+/g, ' ')
      .replace(/[\u200B-\u200D\u200E\u200F\uFEFF]/g, '')
      .trim();
  }

  static extractArea(text: string): string {
    if (!text) return '';

    const normalized = text
      .replace(/\u200E/g, '')
      .replace(/\u200F/g, '')
      .replace(/km\u00B2/g, 'km2')
      .replace(/&nbsp;/g, ' ')
      .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ');

    // 1. Try to find km2 specifically, allowing commas or spaces as separators
    const kmPattern = /([0-9]{1,3}(?:[ ,.][0-9]{3})+(?:\.\d+)?)\s*km2?/;
    const kmMatch = normalized.match(kmPattern);
    if (kmMatch) return kmMatch[1].replace(/[ ,.]/g, (m) => m === '.' && normalized.includes(',') ? '.' : ''); // Handle . as thousands separator unless decimal exists

    const kmPattern2 = /([0-9]+(?:\.\d+)?)\s*km2?/;
    const kmMatch2 = normalized.match(kmPattern2);
    if (kmMatch2) return kmMatch2[1];

    const fallbackPattern = /([0-9]{1,3}(?:[., ][0-9]{3})*(?:\.\d+)?)(?:\s*sq\s*mi|\s*<|\s*$)/;
    const fallbackMatch = normalized.match(fallbackPattern);
    if (fallbackMatch) return fallbackMatch[1].replace(/[, ]/g, '');

    return '';
  }

  static extractPopulation(text: string): string {
    if (!text) return '';

    const normalized = text
      .replace(/(\d+),(\d{1,3})\s*(million|billion)/g, '$1.$2 $3')
      .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ');

    // 1. Range match
    const rangePattern = /([0-9,.]+)\s*[–-]\s*([0-9,.]+)\s*(million|billion)?(?=\s*(?:\(|\s|$))/i;
    const rangeMatch = normalized.match(rangePattern);
    if (rangeMatch) {
      const low = parseFloat(rangeMatch[1].replace(/,/g, ''));
      const high = parseFloat(rangeMatch[2].replace(/,/g, ''));
      let average = (low + high) / 2;

      const multiplier = rangeMatch[3]?.toLowerCase();
      if (multiplier === 'million') average *= 1_000_000;
      else if (multiplier === 'billion') average *= 1_000_000_000;

      return Math.round(average).toString();
    }

    // 2. Single value with million/billion
    const singlePattern = /([0-9,.]+)\s*(million|billion)(?=\s*(?:\(|\s|$))/i;
    const singleMatch = normalized.match(singlePattern);
    if (singleMatch) {
      let val = parseFloat(singleMatch[1].replace(/,/g, ''));
      const multiplier = singleMatch[2].toLowerCase();
      if (multiplier === 'million') val *= 1_000_000;
      else if (multiplier === 'billion') val *= 1_000_000_000;
      return Math.round(val).toString();
    }

    // 3. Regular numbers
    const numPattern = /([0-9]{1,3}(?:[., ][0-9]{3})+|[0-9]{4,})(?=\s*(?:[()\s]|$))/g;
    let match;
    while ((match = numPattern.exec(normalized)) !== null) {
      const cleaned = match[1].replace(/[,. ]/g, '');
      if (cleaned.length > 4 || (!cleaned.startsWith('20') && !cleaned.startsWith('19'))) {
        return cleaned;
      }
    }

    // 4. Fallback for small pops or missed ones
    const smallPattern = /([0-9,.]+)(?=\s*(?:[()\s]|$))/g;
    while ((match = smallPattern.exec(normalized)) !== null) {
      const cleaned = match[1].replace(/[,.]/g, '');
      if (cleaned.length > 4 || (!cleaned.startsWith('20') && !cleaned.startsWith('19'))) {
        return cleaned;
      }
    }

    return '';
  }

  static extractDensity(text: string): string {
    if (!text) return '';
    const pattern = /([0-9,.]+)(?=\s*\/?\s*km)/;
    const match = text.match(pattern);
    if (match) return match[1].replace(/,/g, '');
    return '';
  }

  static normalizeFlagUrl(url: string): string {
    if (!url) return '';
    let normalized = url.startsWith('http') ? url : `https:${url}`;
    return normalized.replace(/\/\d+px-/g, '/250px-');
  }
}
