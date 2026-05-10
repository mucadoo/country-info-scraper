import { CheerioAPI, Cheerio } from 'crawlee';
import { AnyNode } from 'domhandler';
import { Country } from '../../types/country.js';
import { ExtractionUtils } from '../../utils/extraction.js';
import { parseListOrLink } from './utils.js';

export function parseCapital($: CheerioAPI, data: Cheerio<AnyNode>, country: Partial<Country>, lang: string): void {
  const dataClone = data.clone();
  dataClone.find('sup, .geo-inline, .geo-default, .geo-dms, .geo-dec, span.plainlinks, .reference, .style, style').remove();
  let dataText = dataClone.html()?.replace(/\s*\([^)]*\)\s*/g, '') || '';
  const cleanedData = $.load(dataText);
  const links = cleanedData('.plainlist ul li a, a');
  const capitals: string[] = [];
  if (links.length > 0) {
    links.each((_, l) => {
      const t = $(l).text().trim();
      if (t && !t.includes('°') && !/\d+/.test(t)) capitals.push(t);
    });
  } else {
    capitals.push(cleanedData.root().text().trim());
  }
  let result = capitals.join(', ').replace(/\s+([,.])/g, '$1');
  result = result.replace(/\s*[0-9]+°[0-9]+′.*/g, '').trim();
  result = result.replace(/\s*[0-9]+°[NSEW].*/g, '').trim();
  result = result.replace(/\s*\d+\.\d+;\s*\d+\.\d+.*/g, '').trim();

  country.capital = { [lang]: result };
}

export function handleOtherFields(headerText: string, data: Cheerio<AnyNode>, country: Partial<Country>, state: any, lang: string = 'en'): void {
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
    en: ['language'],
    pt: ['língua'],
    fr: ['langue'],
    it: ['lingua'],
    es: ['idioma'],
  };

  const isLanguageField = languageKeywords[lang as keyof typeof languageKeywords]?.some(k => lowerHeader.includes(k));

  if (isLanguageField && !state.languageFound) {
      let langs = parseListOrLink(data, '.hlist ul li, .plainlist ul li');
      if (!langs || langs.toLowerCase() === 'none') {
        langs = ExtractionUtils.cleanText(data);
      }
      
      if (langs) {
        country.official_language = { [lang]: langs };
        state.languageFound = true;
      }
  }
}
