import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
    CountrySchema, 
    Country 
} from '../types/country.js';

export * from '../types/country.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

    private getLocalData(): Country[] {
        const potentialPaths = [
            path.resolve(process.cwd(), 'data/sovereign-states.json'),
            path.resolve(__dirname, '../../data/sovereign-states.json'),
        ];

        for (const p of potentialPaths) {
            if (fs.existsSync(p)) {
                try {
                    const content = fs.readFileSync(p, 'utf-8');
                    const data = JSON.parse(content) as { data: Country[] };
                    return data.data;
                } catch {
                    // Continue to next path if current one fails
                }
            }
        }

        throw new Error(`Failed to load local data: checked ${potentialPaths.join(', ')}`);
    }

    /**
     * Fetches the entire database in one single request.
     * Best for rankings, data science, or offline search.
     */
    async getFullDatabase(): Promise<Country[]> {
        if (this.dataSource === 'local') {
            return this.getLocalData();
        }

        const response = await fetch(`${this.baseUrl}api/v1/all.json`);
        if (!response.ok) throw new Error(`Failed to fetch full database: ${response.statusText}`);

        const data = await response.json();
        return z.array(CountrySchema).parse(data);
    }

    async listCountries() {
        if (this.dataSource === 'local') {
            const data = this.getLocalData();
            return CountryIndexSchema.parse(data);
        }

        const response = await fetch(`${this.baseUrl}api/v1/index.json`);
        if (!response.ok) throw new Error(`Failed to fetch country list: ${response.statusText}`);

        const jsonData = await response.json();
        return CountryIndexSchema.parse(jsonData);
    }

    async getCountry(isoCode: string): Promise<Country> {
        if (this.dataSource === 'local') {
            const data = this.getLocalData();
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
