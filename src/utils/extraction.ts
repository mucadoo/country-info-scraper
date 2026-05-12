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

    // 1. Try to find the numeric part before km2.
    // We look for a number that might contain spaces, commas, or dots.
    const kmMatch = normalized.match(/([0-9][0-9,.\s]*)\s*km2?/);
    if (kmMatch) {
      let numStr = kmMatch[1].trim();
      
      const hasComma = numStr.includes(',');
      const hasDot = numStr.includes('.');
      const hasSpace = numStr.includes(' ');

      if (hasSpace) {
        // Strip spaces, check if it's thousands or decimal
        const stripped = numStr.replace(/\s/g, '');
        if (stripped.includes(',') || stripped.includes('.')) {
          numStr = stripped;
        }
      }

      if (hasComma && hasDot) {
        const lastComma = numStr.lastIndexOf(',');
        const lastDot = numStr.lastIndexOf('.');
        if (lastComma > lastDot) {
          // 1.234,56 -> comma is decimal
          return numStr.replace(/[.\s]/g, '').replace(',', '.');
        } else {
          // 1,234.56 -> dot is decimal
          return numStr.replace(/[, \s]/g, '');
        }
      } else if (hasComma) {
        const parts = numStr.split(',');
        // If it looks like thousands (e.g., 1,234 or 1,234,567)
        if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
          return numStr.replace(/,/g, '');
        }
        // Otherwise assume decimal (e.g., 1,23)
        return numStr.replace(',', '.');
      } else if (hasDot) {
        const parts = numStr.split('.');
        if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
          return numStr.replace(/\./g, '');
        }
        return numStr;
      }
      return numStr.replace(/\s/g, '');
    }

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
      const parseVal = (s: string) => {
        const clean = s.includes(',') && s.includes('.') 
          ? (s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, ''))
          : (s.includes(',') ? (s.split(',')[1]?.length === 3 ? s.replace(/,/g, '') : s.replace(',', '.')) : s);
        return parseFloat(clean);
      };

      const low = parseVal(rangeMatch[1]);
      const high = parseVal(rangeMatch[2]);
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
      const s = singleMatch[1];
      const clean = s.includes(',') && s.includes('.') 
        ? (s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, ''))
        : (s.includes(',') ? (s.split(',')[1]?.length === 3 ? s.replace(/,/g, '') : s.replace(',', '.')) : s);
      
      let val = parseFloat(clean);
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
