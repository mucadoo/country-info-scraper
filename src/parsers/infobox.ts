import { CheerioAPI, Cheerio } from 'crawlee';
import { Country } from '../types/country.js';
import { ExtractionUtils } from '../utils/extraction.js';
import { processAreaAndPopulation, ParserState } from './infobox/area-population.js';
import { parseCapital, handleOtherFields } from './infobox/standard-fields.js';
import { parseGDP } from './infobox/gdp.js';
import { parseCurrency } from './infobox/currency.js';
import { processImages } from './infobox/images.js';

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

      processAreaAndPopulation(header, data, country, state);
      if (header.length > 0 && data.length > 0) {
        this.processStandardFields($, header, data, $row, country, state);
      }
      processImages($, $row, country, state);
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

  private static processStandardFields($: CheerioAPI, header: Cheerio<any>, data: Cheerio<any>, row: Cheerio<any>, country: Partial<Country>, state: ParserState): void {
    const headerText = header.text()
      .replace(/\[.*?\]/g, '')
      .replace(/[\s\u00A0]+/g, ' ')
      .trim();

    const lowerHeaderText = headerText.toLowerCase();

    if (lowerHeaderText.includes('capital') && (headerText.length < 30 || lowerHeaderText.includes('largest city') || lowerHeaderText.includes('center'))) {
      parseCapital($, data, country, headerText);
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
      // Inline handling for simple logic left here to avoid complexity
      let demonym = ExtractionUtils.cleanText(data);
      if (demonym.includes(';')) {
        demonym = demonym.split(';')[0].trim();
      }
      country.demonym = demonym;
    } else if (headerText.toLowerCase() === 'government') {
      country.government = ExtractionUtils.cleanText(data);
    } else if (lowerHeaderText.includes('gdp') && lowerHeaderText.includes('nominal')) {
      parseGDP($, row, country);
    } else if (headerText.toLowerCase() === 'currency') {
      country.currency = parseCurrency(data);
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
      tldClone.find('sup, .reference, style, script, link, meta').remove();
      const tlds: string[] = [];
      tldClone.find('li').each((_, li) => {
        const text = $(li).text().trim();
        if (text) tlds.push(text);
      });
      if (tlds.length > 0) {
        country.internet_TLD = tlds.join(', ');
      } else {
        country.internet_TLD = tldClone.text().split('[')[0].trim();
      }
    } else {
      handleOtherFields(headerText, data, country, state);
    }
  }

  private static ensureValidValues(country: Partial<Country>): void {
    country.name = country.name || 'Unknown';
    country.ISO_code = country.ISO_code || null;
    country.capital = country.capital || null;
    country.largest_city = country.largest_city || null;
    country.demonym = country.demonym || null;
    country.calling_code = country.calling_code || null;
    country.currency = country.currency || null;
    country.time_zone = country.time_zone || null;
    country.official_language = country.official_language || null;
    country.internet_TLD = country.internet_TLD || null;
    country.government = country.government || null;
    country.flagUrl = country.flagUrl || '';
    country.description = country.description || '';
  }
}
