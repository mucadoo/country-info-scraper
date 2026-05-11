import { CheerioAPI, Cheerio } from 'crawlee';
import { AnyNode } from 'domhandler';
import { Country } from '../types/country.js';
import { ExtractionUtils } from '../utils/extraction.js';
import { processAreaAndPopulation, ParserState } from './infobox/area-population.js';
import { parseCapital, handleOtherFields } from './infobox/standard-fields.js';
import { parseGDP } from './infobox/gdp.js';
import { parseCurrency } from './infobox/currency.js';
import { processImages } from './infobox/images.js';

const HEADER_MAPPINGS: Record<string, Record<string, string[]>> = {
  capital: { 
    en: ['capital'], 
    pt: ['capital'], 
    fr: ['capitale'], 
    it: ['capitale'], 
    es: ['capital', 'sede'] 
  },
  largest_city: { 
    en: ['largest city', 'largest settlement'], 
    pt: ['maior cidade'], 
    fr: ['plus grande ville'], 
    it: ['centro maggiore', 'città più popolosa'], 
    es: ['ciudad más poblada', 'ciudad más grande'] 
  },
  demonym: { 
    en: ['demonym'], 
    pt: ['gentílico'], 
    fr: ['gentilé'], 
    it: ['gentilizio', 'nome degli abitanti', 'etnico'], 
    es: ['gentilicio'] 
  },
  government: { 
    en: ['government'], 
    pt: ['governo'], 
    fr: ['gouvernement', 'forme de l'], 
    it: ['forma di governo', 'governo'], 
    es: ['gobierno', 'forma de estado'] 
  },
  official_language: { 
    en: ['official language', 'languages'], 
    pt: ['idioma oficial', 'língua oficial', 'línguas'], 
    fr: ['langue officielle', 'langues'], 
    it: ['lingua ufficiale', 'lingue ufficiali', 'lingue'], 
    es: ['idioma oficial', 'lengua oficial', 'lenguas'] 
  },
  currency: { 
    en: ['currency'], 
    pt: ['moeda'], 
    fr: ['monnaie'], 
    it: ['valuta'], 
    es: ['moneda'] 
  },
};

export class InfoboxParser {
  static parse($: CheerioAPI, country: Partial<Country>, lang: string = 'en'): void {
    const infoboxes = $('table.infobox, table.infobox_v2, table.infobox_v3, table.sinottico, div.infobox, div.infobox_v2, div.infobox_v3');
    if (infoboxes.length === 0) return;

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

    infoboxes.each((_, ib) => {
      const $ib = $(ib);
      const rows = $ib.find('> tr, > tbody > tr');
      const targetRows = rows.length > 0 ? rows : $ib.find('tr');

      targetRows.each((_, row) => {
        const $row = $(row);
        const header = $row.find('th').first();
        const data = $row.find('td').first();

        if (lang === 'en') {
          processAreaAndPopulation(header, data, country, state);
        }
        
        if (header.length > 0 && data.length > 0) {
          this.processStandardFields($, header, data, $row, country, state, lang);
        }
        
        if (lang === 'en') {
          processImages($, $row, country, state);
        }
      });
    });

    if (lang === 'en') {
        if (!country.density_km2 && country.population && country.area_km2) {
          country.density_km2 = country.population / country.area_km2;
        }
    }

    if (!country.largest_city) {
      country.largest_city = country.capital;
    }
  }

  private static processStandardFields($: CheerioAPI, header: Cheerio<AnyNode>, data: Cheerio<AnyNode>, row: Cheerio<AnyNode>, country: Partial<Country>, state: ParserState, lang: string): void {
    const headerText = header.text().replace(/\[.*?\]/g, '').replace(/[\s\u00A0]+/g, ' ').trim();
    const lowerHeaderText = headerText.toLowerCase();

    const matches = (key: string) => HEADER_MAPPINGS[key]?.[lang]?.some(m => lowerHeaderText.includes(m)) ?? false;

    if (matches('capital')) {
      const capitals = data.find('a').toArray().map(l => ({
        text: $(l).text().trim(),
        articleId: $(l).attr('href')?.replace('/wiki/', '')
      })).filter(i => i.text);
      if (capitals.length === 0) {
        const text = ExtractionUtils.cleanText(data);
        if (text) capitals.push({ text });
      }
      country.capital = { [lang]: capitals };
    } else if (matches('largest_city')) {
      const cities = data.find('a').toArray().map(l => ({
        text: $(l).text().trim(),
        articleId: $(l).attr('href')?.replace('/wiki/', '')
      })).filter(i => i.text);
      if (cities.length === 0) {
        const text = ExtractionUtils.cleanText(data);
        if (text) cities.push({ text });
      }
      country.largest_city = { [lang]: cities };
    } else if (matches('demonym')) {
      const demonyms = ExtractionUtils.cleanText(data).split(/[;,]/).map(d => ({ text: d.trim() })).filter(d => d.text);
      country.demonym = { [lang]: demonyms };
    } else if (matches('government')) {
      country.government = { [lang]: ExtractionUtils.cleanText(data) };
    } else if (lang === 'en' && lowerHeaderText.includes('gdp') && lowerHeaderText.includes('nominal')) {
      parseGDP($, row, country);
    } else if (matches('currency')) {
      country.currency = { [lang]: parseCurrency(data) };
    } else if (lang === 'en' && headerText.toLowerCase() === 'time zone') {
      country.time_zone = ExtractionUtils.cleanText(data).split(/[;,]/).map(t => t.trim()).filter(t => t);
    } else if (lang === 'en' && lowerHeaderText.includes('calling code')) {
      const dataClone = data.clone();
      dataClone.find('sup, .reference').remove();
      country.calling_code = dataClone.text().split('[')[0].trim().split(/[;,]/).map(c => c.trim()).filter(c => c);
    } else if (lang === 'en' && headerText.includes('ISO 3166 code')) {
      country.ISO_code = ExtractionUtils.cleanText(data);
    } else if (lang === 'en' && lowerHeaderText.includes('internet tld')) {
      const tldClone = data.clone();
      tldClone.find('sup, .reference, style, script, link, meta').remove();
      country.internet_TLD = tldClone.text().split('[')[0].trim().split(/[;,]/).map(t => t.trim()).filter(t => t);
    } else {
      handleOtherFields(headerText, data, country, state, lang);
    }
  }
}
