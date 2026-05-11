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
      
      // FIX: Safely remove parentheses (even nested ones) without ReDoS
      let previous = '';
      while (desc !== previous) {
        previous = desc;
        // This safe regex removes only innermost paired parentheses
        desc = desc.replace(/\([^()]*\)/g, '');
      }

      desc = desc
        .replace(/\s+/g, ' ')
        .trim();
      desc = desc.replace(/\s+([,.])/g, '$1');

      country.description = { [lang]: desc };
      
      // Fallback: Try to extract capital if it's explicitly mentioned in the description
      const capital = country.capital as Record<string, string[] | null | undefined>;
      if (!capital?.[lang] || capital[lang].length === 0) {
        const capitalKeywords = {
            en: 'capital',
            pt: 'capital',
            fr: 'capitale',
            it: 'capitale',
            es: 'capital'
        };
        const keyword = capitalKeywords[lang as keyof typeof capitalKeywords] || 'capital';
        const capitalMatch = desc.match(new RegExp(`(?:${keyword}).*?([A-Z][a-z]+)`, 'i'));
        if (capitalMatch) {
            const currentCapitals = capital?.[lang] || [];
            country.capital = { ...country.capital, [lang]: [...currentCapitals, capitalMatch[1]] };
        }
      }
    }
  }
}
