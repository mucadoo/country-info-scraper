import { CheerioAPI, Cheerio } from 'crawlee';
import { AnyNode } from 'domhandler';
import { Country } from '../../types/country.js';
import { ExtractionUtils } from '../../utils/extraction.js';
import { parseListOrLink } from './utils.js';
import { ParserState } from './area-population.js';

export function parseCapital($: CheerioAPI, data: Cheerio<AnyNode>, country: Partial<Country>, lang: string): void {
  const dataClone = data.clone();
  dataClone.find('sup, .geo-inline, .geo-default, .geo-dms, .geo-dec, span.plainlinks, .reference, .style, style').remove();
  let dataText = dataClone.html()?.replace(/\s*\([^)]*\)\s*/g, '') || '';
  const cleanedData = $.load(dataText);
  const links = cleanedData('.plainlist ul li a, a');
  const capitals: { text: string, articleId?: string }[] = [];
  if (links.length > 0) {
    links.each((_, l) => {
      const t = $(l).text().trim();
      if (t && !t.includes('°') && !/\d+/.test(t)) {
        capitals.push({
          text: t,
          articleId: $(l).attr('href')?.replace('/wiki/', '')
        });
      }
    });
  } else {
    const text = cleanedData.root().text().trim();
    if (text) capitals.push({ text });
  }
  
  const results = capitals
    .map(c => ({
      ...c,
      text: c.text.replace(/\s*[0-9]+°[0-9]+′.*/g, '').replace(/\s*[0-9]+°[NSEW].*/g, '').replace(/\s*\d+\.\d+;\s*\d+\.\d+.*/g, '').trim()
    }))
    .filter(c => c.text.length > 0);

  country.capital = { [lang]: results };
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
