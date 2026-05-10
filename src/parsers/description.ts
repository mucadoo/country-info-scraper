import { CheerioAPI, Cheerio } from 'crawlee';
import { AnyNode } from 'domhandler';
import { Country } from '../types/country.js';
import { ExtractionUtils } from '../utils/extraction.js';

export class DescriptionParser {
  static parse($: CheerioAPI, country: Partial<Country>, lang: string = 'en'): void {
    // Find the first paragraph outside the infobox
    let infobox = $('table.infobox').first();
    let p: Cheerio<AnyNode> | null = null;

    if (infobox.length > 0) {
      p = infobox.nextAll('p').first();
    }

    if (!p || p.length === 0) {
      p = $('p').first();
    }

    // Skip empty paragraphs
    while (p && p.length > 0 && p.text().trim() === '') {
      p = p.nextAll('p').first();
    }

    if (p && p.length > 0) {
      let desc = ExtractionUtils.cleanText(p);
      desc = desc
        .replace(/\(([^()]*|\([^()]*\))*\)/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      desc = desc.replace(/\s+([,.])/g, '$1');

      country.description = { [lang]: desc };
      
      // Fallback: Try to extract capital if it's explicitly mentioned in the description
      if (!(country.capital as any)?.[lang]) {
        const capitalMatch = desc.match(/(?:capitale|capital).*?([A-Z][a-z]+)/i);
        if (capitalMatch) {
            country.capital = { ...country.capital, [lang]: capitalMatch[1] };
        }
      }
    }
  }
}
