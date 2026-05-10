import { CheerioAPI, Cheerio } from 'crawlee';
import { AnyNode } from 'domhandler';
import { Country } from '../types/country.js';
import { ExtractionUtils } from '../utils/extraction.js';

export class DescriptionParser {
  static parse($: CheerioAPI, country: Partial<Country>): void {
    let infobox = $('table.infobox').first();
    let p: Cheerio<AnyNode> | null = null;

    if (infobox.length > 0) {
      p = infobox.nextAll('p').first();
    }

    if (!p || p.length === 0) {
      p = $('p').first();
    }

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

      country.description = desc;
    }
  }
}
