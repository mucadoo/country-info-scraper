import { z } from 'zod';
import { 
    CountrySchema, 
    Country 
} from '../types/country.js';

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

    private async getLocalData(): Promise<Country[]> {
        try {
            const { default: data } = await import('../../data/sovereign-states.json', { assert: { type: 'json' } });
            return (data as unknown) as Country[];
        } catch (error) {
            throw new Error(`Failed to load local data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async listCountries() {
        if (this.dataSource === 'local') {
            const data = await this.getLocalData();
            return CountryIndexSchema.parse(data);
        }

        const response = await fetch(`${this.baseUrl}api/v1/index.json`);
        if (!response.ok) throw new Error(`Failed to fetch country list: ${response.statusText}`);

        const jsonData = await response.json();
        return CountryIndexSchema.parse(jsonData);
    }

    async getCountry(isoCode: string): Promise<Country> {
        if (this.dataSource === 'local') {
            const data = await this.getLocalData();
            const country = data.find(c => c.isoCode === isoCode.toUpperCase());
            if (!country) throw new Error(`Country ${isoCode} not found in local data`);
            return CountrySchema.parse(country);
        }

        const response = await fetch(`${this.baseUrl}api/v1/countries/${isoCode.toUpperCase()}.json`);
        if (!response.ok) throw new Error(`Failed to fetch country ${isoCode}: ${response.statusText}`);

        const jsonData = await response.json();
        return CountrySchema.parse(jsonData);
    }
}
