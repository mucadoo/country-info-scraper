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

        if (typeof process !== 'undefined' && process.versions?.node) {
            const fs = await import('fs');
            const path = await import('path');

            // Works in both CJS (__dirname) and ESM (import.meta.url)
            let baseDir: string;
            try {
                // ESM
                const { fileURLToPath } = await import('url');
                // import.meta.url is available in ESM
                baseDir = path.dirname(fileURLToPath(import.meta.url));
            } catch {
                // CJS: __dirname is injected by Node/tsup
                baseDir = __dirname;
            }

            const candidates = [
                path.resolve(process.cwd(), 'data/sovereign-states.json'),
                path.resolve(baseDir, '../../data/sovereign-states.json'),
                path.resolve(baseDir, '../data/sovereign-states.json'),
            ];

            for (const p of candidates) {
                if (fs.existsSync(p)) {
                    try {
                        const content = fs.readFileSync(p, 'utf-8');
                        const data = JSON.parse(content) as { data: Country[] };
                        return data.data;
                    } catch { /* try next */ }
                }
            }
        }

        throw new Error(
            `Local data not found. Provide 'localData' in constructor, ` +
            `or ensure data/sovereign-states.json is accessible at runtime.`
        );
    }

    async getFullDatabase(): Promise<{ data: Country[], source: 'remote' | 'local', timestamp: string }> {
        if (this.dataSource === 'remote') {
            try {
                const response = await fetch(`${this.baseUrl}api/v1/all.json`);
                if (response.ok) {
                    const data = await response.json();
                    return {
                        data: z.array(CountrySchema).parse(data),
                        source: 'remote',
                        timestamp: new Date().toISOString()
                    };
                }
            } catch (e) {
                console.warn('Network failure fetching full database, falling back to local data.', e);
            }
        }
        return {
            data: await this.getLocalData(),
            source: 'local',
            timestamp: new Date().toISOString()
        };
    }

    async listCountries(): Promise<{ data: ReturnType<typeof CountryIndexSchema.parse>, source: 'remote' | 'local', timestamp: string }> {
        if (this.dataSource === 'remote') {
            try {
                const response = await fetch(`${this.baseUrl}api/v1/index.json`);
                if (response.ok) {
                    const jsonData = await response.json();
                    return {
                        data: CountryIndexSchema.parse(jsonData),
                        source: 'remote',
                        timestamp: new Date().toISOString()
                    };
                }
            } catch (e) {
                console.warn('Network failure fetching country list, falling back to local data.', e);
            }
        }
        const data = await this.getLocalData();
        return {
            data: CountryIndexSchema.parse(data),
            source: 'local',
            timestamp: new Date().toISOString()
        };
    }

    async getCountry(isoCode: string): Promise<{ data: Country, source: 'remote' | 'local', timestamp: string }> {
        if (this.dataSource === 'remote') {
            try {
                const response = await fetch(`${this.baseUrl}api/v1/countries/${isoCode.toUpperCase()}.json`);
                if (response.ok) {
                    const jsonData = await response.json();
                    return {
                        data: CountrySchema.parse(jsonData),
                        source: 'remote',
                        timestamp: new Date().toISOString()
                    };
                }
            } catch (e) {
                console.warn(`Network failure fetching country ${isoCode}, falling back to local data.`, e);
            }
        }

        const data = await this.getLocalData();
        const country = data.find(c => c.isoCode === isoCode.toUpperCase());
        if (!country) throw new Error(`Country ${isoCode} not found in local data`);
        return {
            data: CountrySchema.parse(country),
            source: 'local',
            timestamp: new Date().toISOString()
        };
    }
}

const CountryIndexSchema = z.array(
    CountrySchema.pick({ isoCode: true, name: true, flagUrl: true })
);
