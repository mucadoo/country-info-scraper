import { z } from 'zod';
import { CountrySchema, Country } from '../types/country.js';
import { WikiGeoOptions, CountryIndexSchema } from './types.js';

export * from './types.js';

export class WikiGeoClient {
    private dataSource: 'local' | 'remote';
    private baseUrl: string;
    private localData?: Country[];

    constructor(options: WikiGeoOptions = {}) {
        this.dataSource = options.dataSource || 'local';
        this.baseUrl = options.baseUrl || 'https://mucadoo.github.io/wikigeo-data-scraper/';
        this.localData = options.localData;
        if (!this.baseUrl.endsWith('/')) this.baseUrl += '/';
    }

    private async getLocalData(): Promise<Country[]> {
        if (this.localData) return this.localData;
        throw new Error(`Local data not found. Please provide 'localData' in constructor.`);
    }

    async getFullDatabase(): Promise<Country[]> {
        if (this.dataSource === 'local') {
            return await this.getLocalData();
        }

        const response = await fetch(`${this.baseUrl}api/v1/all.json`);
        if (!response.ok) throw new Error(`Failed to fetch full database: ${response.statusText}`);

        const data = await response.json();
        return z.array(CountrySchema).parse(data);
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
