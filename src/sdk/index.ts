import { z } from 'zod';
import { 
    CountrySchema, 
    Country 
} from '../types/country.js';
import data from '../../data/sovereign-states.json' assert { type: 'json' };

export * from '../types/country.js';

const CountryIndexSchema = z.array(
    CountrySchema.pick({ isoCode: true, name: true, flagUrl: true })
);

export interface WikiGeoOptions {
    dataSource?: 'local' | 'remote';
    baseUrl?: string;
}

export class WikiGeoClient {
    private dataSource: 'local' | 'remote';
    private baseUrl: string;

    constructor(options: WikiGeoOptions = {}) {
        this.dataSource = options.dataSource || 'local';
        this.baseUrl = options.baseUrl || 'https://mucadoo.github.io/wikigeo-data-scraper/';
        if (!this.baseUrl.endsWith('/')) this.baseUrl += '/';
    }

    async listCountries() {
        if (this.dataSource === 'local') {
            return CountryIndexSchema.parse(data);
        }

        const response = await fetch(`${this.baseUrl}api/v1/index.json`);
        if (!response.ok) throw new Error(`Failed to fetch country list: ${response.statusText}`);
        
        const jsonData = await response.json();
        return CountryIndexSchema.parse(jsonData);
    }

    async getCountry(isoCode: string): Promise<Country> {
        if (this.dataSource === 'local') {
            const country = (data as unknown as Country[]).find(c => c.isoCode === isoCode.toUpperCase());
            if (!country) throw new Error(`Country ${isoCode} not found in local data`);
            return CountrySchema.parse(country);
        }

        const response = await fetch(`${this.baseUrl}api/v1/countries/${isoCode.toUpperCase()}.json`);
        if (!response.ok) throw new Error(`Failed to fetch country ${isoCode}: ${response.statusText}`);
        
        const jsonData = await response.json();
        return CountrySchema.parse(jsonData);
    }
}
