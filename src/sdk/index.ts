import { z } from 'zod';
import { 
    CountrySchema, 
    Country 
} from '../types/country.js';

export * from '../types/country.js';

export interface WikiGeoOptions {
    dataSource?: 'local' | 'remote';
    baseUrl?: string;
    localData?: Country[];
}

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

        // Runtime check for Node.js environment
        if (typeof process !== 'undefined' && process.versions && process.versions.node) {
            const fs = await import('fs');
            const path = await import('path');
            const { fileURLToPath } = await import('url');
            const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
                        // Continue to next path
                    }
                }
            }
        }

        throw new Error(`Local data not found. Please provide 'localData' in constructor or run in a Node.js environment with accessible data files.`);
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

const CountryIndexSchema = z.array(
    CountrySchema.pick({ isoCode: true, name: true, flagUrl: true })
);
