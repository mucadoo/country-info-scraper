import { CheerioAPI } from 'crawlee';
import { Country } from '../types/country.js';
import { InfoboxParser } from './infobox.js';
import { DescriptionParser } from './description.js';

export class CountryParser {
  static parseCountry($: CheerioAPI): Partial<Country> {
    const country: Partial<Country> = {};
    InfoboxParser.parse($, country);
    DescriptionParser.parse($, country);
    return country;
  }
}
