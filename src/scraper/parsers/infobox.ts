import { CheerioAPI, Cheerio } from 'crawlee';
import { AnyNode } from 'domhandler';
import { Country, getEmptyLocalizedField } from '../../types/country.js';
import { ExtractionUtils } from '../utils/extraction.js';
import { processAreaAndPopulation, ParserState } from './infobox/area-population.js';
import { parseCapital, parseLargestCity, handleOtherFields } from './infobox/standard-fields.js';
import { parseListOrLink } from './infobox/utils.js';
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
  largestCity: { 
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
  officialLanguage: { 
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
  timeZone: {
    en: ['time zone'],
    pt: ['fuso horário'],
    fr: ['fuseau horaire'],
    it: ['fuso orario'],
    es: ['huso horario']
  },
  callingCode: {
    en: ['calling code'],
    pt: ['código de chamada', 'ddi'],
    fr: ['indicatif téléphonique'],
    it: ['prefisso tel.'],
    es: ['prefijo telefónico']
  },
  internetTld: {
    en: ['internet tld'],
    pt: ['tld na internet', 'domínio de topo'],
    fr: ['domaine internet'],
    it: ['dominio di primo livello'],
    es: ['dominio de internet']
  }
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
        if (!country.densityKm2 && country.population && country.areaKm2 && country.areaKm2 > 0) {
          country.densityKm2 = country.population / country.areaKm2;
        }
    }

    if (!country.largestCity) {
      country.largestCity = country.capital ?? [];
    }
  }

  private static processStandardFields($: CheerioAPI, header: Cheerio<AnyNode>, data: Cheerio<AnyNode>, row: Cheerio<AnyNode>, country: Partial<Country>, state: ParserState, lang: string): void {
    const headerText = header.text().replace(/\[.*?\]/g, '').replace(/[\s\u00A0]+/g, ' ').trim();
    const lowerHeaderText = headerText.toLowerCase();

    const matches = (key: string) => HEADER_MAPPINGS[key]?.[lang]?.some(m => lowerHeaderText.includes(m)) ?? false;

    if (matches('capital')) {
      parseCapital($, data, country, lang);
    } else if (matches('largestCity')) {
      parseLargestCity($, data, country, lang);
    } else if (matches('demonym')) {
      const demonyms = parseListOrLink(data, '.hlist ul li, .plainlist ul li, a');
      country.demonym = demonyms.map(item => {
        const name = getEmptyLocalizedField();
        name[lang as keyof typeof name] = item.text;
        return {
          articleId: item.articleId || null,
          name
        };
      });
    } else if (matches('government')) {
      const gov = parseListOrLink(data, '.hlist ul li, .plainlist ul li, a');
      country.government = gov.map(item => {
        const name = getEmptyLocalizedField();
        name[lang as keyof typeof name] = item.text;
        return {
          articleId: item.articleId || null,
          name
        };
      });
    } else if (lang === 'en' && lowerHeaderText.includes('gdp') && lowerHeaderText.includes('nominal')) {
      parseGDP($, row, country);
    } else if (matches('currency')) {
      country.currency = parseCurrency(data).map(item => {
        const name = getEmptyLocalizedField();
        name[lang as keyof typeof name] = item.text;
        return {
          articleId: item.articleId || null,
          name,
          isoCode: item.isoCode || null
        };
      });
    } else if (matches('timeZone')) {
      const tz = parseListOrLink(data, '.hlist ul li, .plainlist ul li, a');
      country.timeZone = tz.map(item => {
        const name = getEmptyLocalizedField();
        name[lang as keyof typeof name] = item.text;
        return {
          articleId: item.articleId || null,
          name
        };
      });
    } else if (matches('callingCode')) {
      const dataClone = data.clone();
      dataClone.find('sup, .reference').remove();
      country.callingCode = dataClone.text().split('[')[0].trim().split(/[;,]/).map(c => c.trim()).filter(c => c);
    } else if (lang === 'en' && headerText.toLowerCase().includes('iso 3166 code')) {
      country.isoCode = ExtractionUtils.cleanText(data);
    } else if (matches('internetTld')) {
      const tldClone = data.clone();
      tldClone.find('sup, .reference, style, script, link, meta').remove();
      country.internetTld = tldClone.text().split('[')[0].trim().split(/[;,]/).map(t => t.trim()).filter(t => t);
    } else {
      handleOtherFields(headerText, data, country, state, lang);
    }
  }
}
