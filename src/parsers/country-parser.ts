import { CheerioAPI } from 'crawlee';
import { Country } from '../types/country.js';
import { InfoboxParser } from './infobox.js';
import { DescriptionParser } from './description.js';

export class CountryParser {
  static parseCountry($: CheerioAPI, country: Partial<Country> = {}, lang: string = 'en'): Partial<Country> {
    InfoboxParser.parse($, country, lang);
    DescriptionParser.parse($, country, lang);
    return country;
  }
}
