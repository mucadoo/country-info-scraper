import { CheerioAPI, Cheerio } from 'crawlee';
import { AnyNode } from 'domhandler';
import { Country } from '../../types/country.js';
import { ExtractionUtils } from '../../utils/extraction.js';
import { parseListOrLink } from './utils.js';
import { ParserState } from './area-population.js';

export function parseCityList($: CheerioAPI, data: Cheerio<AnyNode>, lang: string): { text: string, articleId?: string }[] {
  const dataClone = data.clone();
  // Remove coordinates, references, and styles
  dataClone.find('sup, .geo-inline, .geo-default, .geo-dms, .geo-dec, .geo, span.plainlinks, .reference, .style, style, .as_of').remove();
  
  const results: { text: string, articleId?: string }[] = [];
  
  // Try to find links first
  const links = dataClone.find('a');
  if (links.length > 0) {
    links.each((_, l) => {
      const $l = $(l);
      const text = $l.text().trim();
      const href = $l.attr('href') || '';
      
      // Filter out coordinate links and empty text
      if (text && !text.includes('°') && !href.includes('geohack') && !/^-?\d+\.\d+/.test(text)) {
        results.push({
          text,
          articleId: href.startsWith('/wiki/') ? decodeURIComponent(href.replace('/wiki/', '')) : href
        });
      }
    });
  }

  // Fallback to text if no valid links found or if we want to include plain text entries
  if (results.length === 0) {
    const text = ExtractionUtils.cleanText(dataClone);
    if (text) {
        // Handle cases where multiple cities are separated by commas or newlines
        const parts = text.split(/\s*,\s*|\s*;\s*|\s*\n\s*/);
        parts.forEach(p => {
            const cleanP = p.replace(/\s*\(.*?\)\s*/g, '').trim();
            if (cleanP && !cleanP.includes('°') && !/\d{1,3}°/.test(cleanP)) {
                results.push({ text: cleanP });
            }
        });
    }
  }

  return results.map(r => ({
      ...r,
      text: r.text.replace(/\[\d+\]/g, '').trim()
  })).filter(r => r.text.length > 0);
}

export function parseCapital($: CheerioAPI, data: Cheerio<AnyNode>, country: Partial<Country>, lang: string): void {
  country.capital = { [lang]: parseCityList($, data, lang) };
}

export function parseLargestCity($: CheerioAPI, data: Cheerio<AnyNode>, country: Partial<Country>, lang: string): void {
  country.largest_city = { [lang]: parseCityList($, data, lang) };
}

export function handleOtherFields(headerText: string, data: Cheerio<AnyNode>, country: Partial<Country>, state: ParserState, lang: string = 'en'): void {
  const lowerHeader = headerText.toLowerCase();

  // Keep HDI parsing only for English (metrics)
  if (lang === 'en' && lowerHeader.includes('hdi')) {
    const dataClone = data.clone();
    dataClone.find('sup, br, .nowrap, .reference').remove();
    const hdiStr = dataClone.text().split(' ')[0].trim();
    if (/0\.\d{3}/.test(hdiStr)) {
      const val = parseFloat(hdiStr);
      if (!isNaN(val)) country.hdi = val;
    }
  }

  // Language parsing
  const languageKeywords = {
    en: ['language', 'languages'],
    pt: ['língua', 'idioma', 'línguas'],
    fr: ['langue', 'langues'],
    it: ['lingua', 'lingue'],
    es: ['idioma', 'lengua', 'lenguas'],
  };

  const isLanguageField = languageKeywords[lang as keyof typeof languageKeywords]?.some(k => lowerHeader.includes(k));

  if (isLanguageField && !state.languageFound) {
      let langs = parseListOrLink(data, '.hlist ul li, .plainlist ul li');
      if (langs.length === 0) {
        const text = ExtractionUtils.cleanText(data);
        if (text && text.toLowerCase() !== 'none') langs = [{ text }];
      }
      
      if (langs.length > 0) {
        country.official_language = { [lang]: langs };
        state.languageFound = true;
      }
  }
}
