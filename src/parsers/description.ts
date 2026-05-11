import { CheerioAPI, Cheerio } from 'crawlee';
import { AnyNode } from 'domhandler';
import { Country } from '../types/country.js';
import { ExtractionUtils } from '../utils/extraction.js';

export class DescriptionParser {
  static parse($: CheerioAPI, country: Partial<Country>, lang: string = 'en'): void {
    // Find the first few paragraphs outside the infobox
    const infoboxSelector = 'table.infobox, table.infobox_v2, table.infobox_v3, table.sinottico, div.infobox, div.infobox_v2, div.infobox_v3';
    let infobox = $(infoboxSelector).first();
    let paragraphs: Cheerio<AnyNode>[] = [];

    if (infobox.length > 0) {
      paragraphs = infobox.nextAll('p').slice(0, 5).toArray().map(p => $(p));
    }

    if (paragraphs.length === 0) {
      paragraphs = $('p').slice(0, 5).toArray().map(p => $(p));
    }

    // Combine paragraphs for search but keep the first non-empty for description
    let firstDesc = '';

    for (const p of paragraphs) {
      const text = ExtractionUtils.cleanText(p);
      if (text) {
        if (!firstDesc) firstDesc = text;
      }
    }

    if (firstDesc) {
      let desc = firstDesc;
      
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

      country.description = { ...country.description, [lang]: desc };
    }
  }
}
