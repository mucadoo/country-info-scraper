import { CheerioAPI, Cheerio } from 'crawlee';
import { AnyNode } from 'domhandler';
import { Country } from '../types/country.js';
import { ExtractionUtils } from '../utils/extraction.js';

interface ParserState {
  areaHeaderFound: boolean;
  areaFound: boolean;
  populationHeaderFound: boolean;
  populationFound: boolean;
  densityFound: boolean;
  languageFound: boolean;
  flagFound: boolean;
  currentSection: string | null;
}

export class InfoboxParser {
  static parse($: CheerioAPI, country: Partial<Country>): void {
    let infobox = $('table.infobox.ib-country').first();
    if (infobox.length === 0) infobox = $('table.infobox.vcard').first();
    if (infobox.length === 0) infobox = $('table.infobox').first();
    if (infobox.length === 0) return;

    const state: ParserState = {
      areaHeaderFound: false,
      areaFound: false,
      populationHeaderFound: false,
      populationFound: false,
      densityFound: false,
      languageFound: false,
      flagFound: false,
      currentSection: null,
    };

    const rows = infobox.find('> tr, > tbody > tr');
    const targetRows = rows.length > 0 ? rows : infobox.find('tr');

    targetRows.each((_, row) => {
      const $row = $(row);
      const header = $row.find('th').first();
      const data = $row.find('td').first();

      this.processAreaAndPopulation(header, data, country, state);
      if (header.length > 0 && data.length > 0) {
        this.processStandardFields($, header, data, $row, country, state);
      }
      this.processImages($, $row, country, state);
    });

    // Automated density calculation if missing
    if (!country.density_km2 && country.population && country.area_km2) {
      country.density_km2 = country.population / country.area_km2;
    }

    if (!country.largest_city) {
      country.largest_city = country.capital;
    }

    this.ensureValidValues(country);
  }

  private static ensureValidValues(country: Partial<Country>): void {
    country.name = country.name || 'Unknown';
    country.ISO_code = country.ISO_code || 'N/A';
    country.capital = country.capital || 'N/A';
    country.largest_city = country.largest_city || 'N/A';
    country.demonym = country.demonym || 'N/A';
    country.calling_code = country.calling_code || 'N/A';
    country.currency = country.currency || 'N/A';
    country.time_zone = country.time_zone || 'N/A';
    country.official_language = country.official_language || 'N/A';
    country.internet_TLD = country.internet_TLD || 'N/A';
    country.government = country.government || 'N/A';
    country.flagUrl = country.flagUrl || '';
    country.description = country.description || '';
  }

  private static processAreaAndPopulation(header: Cheerio<AnyNode>, data: Cheerio<AnyNode>, country: Partial<Country>, state: ParserState): void {
    if (header.length === 0) return;
    const text = header.text().toLowerCase().trim();

    const isMainHeader = header.hasClass('infobox-header') || header.attr('colspan') === '2';

    if (isMainHeader) {
      if (text.includes('area')) {
        state.currentSection = 'area';
        state.areaHeaderFound = true;
      } else if (text.includes('population')) {
        state.currentSection = 'population';
        state.populationHeaderFound = true;
      } else if (text.includes('gdp') || text.includes('hdi') || text.includes('government') || text.includes('demographics') || text.includes('geography')) {
        state.currentSection = 'other';
      }
    } else if (state.currentSection === null) {
      if (text === 'area') {
        state.currentSection = 'area';
        state.areaHeaderFound = true;
      } else if (text === 'population') {
        state.currentSection = 'population';
        state.populationHeaderFound = true;
      }
    }

    if (data.length === 0) return;

    if (state.currentSection === 'area' && !state.areaFound) {
      if (text.includes('total') || text.includes('land') || text.includes('•') || text === 'area') {
        const area = ExtractionUtils.extractArea(ExtractionUtils.cleanText(data));
        if (area) {
          country.area_km2 = parseFloat(area);
          state.areaFound = true;
        }
      }
    }

    if (state.currentSection === 'population' && !state.populationFound) {
      if (text.includes('estimate') || text.includes('census') || text.includes('total') || text.includes('•') || text === 'population') {
        const pop = ExtractionUtils.extractPopulation(ExtractionUtils.cleanText(data));
        if (pop) {
          country.population = parseInt(pop, 10);
          state.populationFound = true;
        }
      }
    }

    if (!state.densityFound && state.currentSection === 'population' && text.includes('density')) {
      const density = ExtractionUtils.extractDensity(ExtractionUtils.cleanText(data));
      if (density) {
        country.density_km2 = parseFloat(density);
        state.densityFound = true;
      }
    }
  }

  private static processStandardFields($: CheerioAPI, header: Cheerio<AnyNode>, data: Cheerio<AnyNode>, row: Cheerio<AnyNode>, country: Partial<Country>, state: ParserState): void {
    const headerText = header.text()
      .replace(/\[.*?\]/g, '')
      .replace(/[\s\u00A0]+/g, ' ')
      .trim();

    const lowerHeaderText = headerText.toLowerCase();

    if (lowerHeaderText.includes('capital') && (headerText.length < 30 || lowerHeaderText.includes('largest city') || lowerHeaderText.includes('center'))) {
      this.parseCapital($, data, country, headerText);
      return;
    }

    if (lowerHeaderText.includes('largest city') || lowerHeaderText.includes('largest settlement') || lowerHeaderText.includes('largest metropolitan area')) {
      const largestCityLink = data.find('a').first();
      let cityText = largestCityLink.length > 0 ? largestCityLink.text() : ExtractionUtils.cleanText(data);
      
      if (cityText.includes(',')) cityText = cityText.split(',')[0].trim();
      if (cityText.includes(';')) cityText = cityText.split(';')[0].trim();
      if (cityText.toLowerCase().includes('locally:')) cityText = cityText.split(/locally:/i)[0].trim();
      
      country.largest_city = cityText;
    } else if (lowerHeaderText.includes('demonym')) {
      let demonym = this.parseListOrLink(data, '.hlist ul li, .plainlist ul li');
      const fullText = ExtractionUtils.cleanText(data);
      if (fullText.includes(';')) {
        demonym = fullText.split(';')[0].trim();
      }
      country.demonym = demonym;
    } else if (headerText.toLowerCase() === 'government') {
      country.government = ExtractionUtils.cleanText(data);
    } else if (lowerHeaderText.includes('gdp') && lowerHeaderText.includes('nominal')) {
      this.parseGDP($, row, country);
    } else if (headerText.toLowerCase() === 'currency') {
      country.currency = this.parseCurrency(data);
    } else if (headerText.toLowerCase() === 'time zone') {
      country.time_zone = ExtractionUtils.cleanText(data);
    } else if (lowerHeaderText.includes('calling code')) {
      const dataClone = data.clone();
      dataClone.find('sup, .reference').remove();
      const cc = dataClone.text().split('[')[0].trim();
      country.calling_code = cc;
    } else if (headerText.includes('ISO 3166 code')) {
      country.ISO_code = ExtractionUtils.cleanText(data);
    } else if (lowerHeaderText.includes('internet tld')) {
      const tldClone = data.clone();
      tldClone.find('sup, .reference').remove();
      country.internet_TLD = tldClone.text().split('[')[0].trim();
    } else {
      this.handleOtherFields(headerText, data, country, state);
    }
  }

  private static parseCapital($: CheerioAPI, data: Cheerio<AnyNode>, country: Partial<Country>, headerText: string): void {
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

  private static parseListOrLink(data: Cheerio<AnyNode>, selector: string): string {
    const dataClone = data.clone();
    dataClone.find('sup, i, .reference').remove();
    dataClone.find('br').append(' ');

    const elements = dataClone.find(selector);
    if (elements.length > 0) {
      return elements.map((_, el) => (el as any).children[0]?.data?.trim() || '').get().filter(t => t).join(', ');
    }
    const single = dataClone.find('a').first();
    if (single.length > 0 && !/^\[\d+\]$/.test(single.text())) {
      return single.text().trim();
    }
    return dataClone.text().trim();
  }

  private static parseNumericValue(text: string): number | null {
    if (!text) return null;
    let cleaned = text.replace(/[^\d.\w\s]/g, '').trim().toLowerCase();
    let multiplier = 1;

    if (cleaned.includes('trillion')) {
      multiplier = 1_000_000_000_000;
      cleaned = cleaned.replace('trillion', '').trim();
    } else if (cleaned.includes('billion')) {
      multiplier = 1_000_000_000;
      cleaned = cleaned.replace('billion', '').trim();
    } else if (cleaned.includes('million')) {
      multiplier = 1_000_000;
      cleaned = cleaned.replace('million', '').trim();
    }

    const parts = cleaned.split(/\s+/);
    for (const part of parts) {
      const val = parseFloat(part);
      if (!isNaN(val)) {
        // Fix precision issues
        return Math.round(val * multiplier);
      }
    }
    return null;
  }

  private static parseGDP($: CheerioAPI, row: Cheerio<AnyNode>, country: Partial<Country>): void {
    let curr = row.next();
    for (let i = 0; i < 5 && curr.length > 0; i++) {
      const rowText = curr.text().toLowerCase();
      if (rowText.includes('hdi') || rowText.includes('gini') || rowText.includes('currency')) break;

      const labelCell = curr.find('th, td').first();
      const valueCell = curr.find('td').last();

      if (labelCell.length > 0 && valueCell.length > 0) {
        const labelText = labelCell.text().toLowerCase();
        if (labelText.includes('total') || /.*\d{4}.*/.test(labelText)) {
          const dClone = valueCell.clone();
          dClone.find('sup, .reference').remove();
          let gdpValue = dClone.text().replace(/\s*\([^)]*\)\s*/g, '').trim();
          gdpValue = gdpValue.replace(/(\d+),(\d{3})\s*(million|billion|trillion)/g, '$1.$2 $3');
          const parsed = this.parseNumericValue(gdpValue);
          if (parsed !== null) {
            country.gdp = parsed;
            break;
          }
        }
      }
      curr = curr.next();
    }
  }

  private static parseCurrency(data: Cheerio<AnyNode>): string {
    const dataClone = data.clone();
    dataClone.find('sup, i, br, .reference').remove();
    const links = dataClone.find('.plainlist ul li a, a');
    if (links.length > 0) {
      return links.map((_, l) => {
        const title = (l as any).attribs?.title || '';
        if (title.toLowerCase() === 'iso 4217') return '';
        return (l as any).children[0]?.data?.split('(')[0].trim() || '';
      }).get().filter(t => t).join(', ');
    }
    return dataClone.text().split('(')[0].trim();
  }

  private static handleOtherFields(headerText: string, data: Cheerio<AnyNode>, country: Partial<Country>, state: ParserState): void {
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
        
        let langs = this.parseListOrLink(data, '.hlist ul li, .plainlist ul li');
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

  private static processImages($: CheerioAPI, row: Cheerio<AnyNode>, country: Partial<Country>, state: ParserState): void {
    if (state.flagFound) return;
    const imageCells = row.find('td.infobox-image, td.maptable');
    imageCells.each((_, cell) => {
      const $cell = $(cell);
      $cell.find('img').each((_, img) => {
        const $img = $(img);
        const url = 'https:' + ($img.attr('src') || '');
        const alt = ($img.attr('alt') || '').toLowerCase();
        
        const descText = $cell.text().toLowerCase();
        if (descText.includes('flag') || alt.includes('flag') || url.toLowerCase().includes('flag')) {
          if (!alt.includes('arms') && !url.toLowerCase().includes('arms') && !url.toLowerCase().includes('seal')) {
            country.flagUrl = ExtractionUtils.normalizeFlagUrl(url);
            state.flagFound = true;
            return false; // break
          }
        }
      });
      if (state.flagFound) return false;
    });
  }
}
