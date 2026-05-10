import { CheerioAPI, Cheerio } from 'crawlee';
import { AnyNode } from 'domhandler';
import { Country } from '../../types/country.js';
import { ExtractionUtils } from '../../utils/extraction.js';
import { parseListOrLink } from './utils.js';

export function parseCapital($: CheerioAPI, data: Cheerio<AnyNode>, country: Partial<Country>, headerText: string): void {
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

  country.capital = result;
  if (headerText.toLowerCase().includes('largest city')) country.largest_city = result;
}

export function handleOtherFields(headerText: string, data: Cheerio<AnyNode>, country: Partial<Country>, state: any): void {
  if (headerText.toLowerCase().includes('hdi')) {
    const dataClone = data.clone();
    dataClone.find('sup, br, .nowrap, .reference').remove();
    const hdiStr = dataClone.text().split(' ')[0].trim();
    if (/0\.\d{3}/.test(hdiStr)) {
      const val = parseFloat(hdiStr);
      if (!isNaN(val)) country.hdi = val;
    }
  }

  if (headerText.toLowerCase().includes('language') && !state.languageFound) {
    const lowerHeader = headerText.toLowerCase().replace(/\(.*\)/g, '').trim();
    if ((lowerHeader.includes('official') || lowerHeader.includes('national') || lowerHeader === 'languages' || lowerHeader.includes('recognized'))
         && !lowerHeader.includes('name') && !lowerHeader.includes('native')) {
      
      let langs = parseListOrLink(data, '.hlist ul li, .plainlist ul li');
      if (!langs || langs.toLowerCase() === 'none') {
        langs = ExtractionUtils.cleanText(data);
      }

      if (langs.toLowerCase().includes('none') && langs.includes('(')) {
        const start = langs.indexOf('(');
        const end = langs.lastIndexOf(')');
        if (end > start) {
          langs = langs.substring(start + 1, end).replace(/\s*(?:are in use|are used).*/gi, '').trim();
        }
      }
      
      langs = langs.replace(/^\d+\s+languages?\s*,?\s*/gi, '');
      const lowerLangs = langs.toLowerCase();
      const looksLikeCountryName = lowerLangs.includes('republic') || lowerLangs.includes('kingdom') || 
                                  lowerLangs.includes('state') || lowerLangs.includes('demokrasih') ||
                                  lowerLangs.includes('erresuma') || lowerLangs.includes('gonagasriika') ||
                                  lowerLangs.includes('republiek');

      if (langs && !looksLikeCountryName) {
        country.official_language = langs;
        state.languageFound = true;
      }
    }
  }
}
