import { z } from 'zod';
import { 
    CountrySchema, 
    Country 
} from '../types/country.js';

export * from '../types/country.js';

const CountryIndexSchema = z.array(
    CountrySchema.pick({ isoCode: true, name: true, flagUrl: true })
);

export class WikiGeoClient {
    private baseUrl: string;

    constructor(baseUrl: string = 'https://mucadoo.github.io/wikigeo-data-scraper/') {
        // Ensure trailing slash
        this.baseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    }

    async listCountries() {
        const response = await fetch(`${this.baseUrl}api/v1/index.json`);
        if (!response.ok) throw new Error(`Failed to fetch country list: ${response.statusText}`);
        
        const data = await response.json();
        return CountryIndexSchema.parse(data);
    }

    async getCountry(isoCode: string): Promise<Country> {
        const response = await fetch(`${this.baseUrl}api/v1/countries/${isoCode.toUpperCase()}.json`);
        if (!response.ok) throw new Error(`Failed to fetch country ${isoCode}: ${response.statusText}`);
        
        const data = await response.json();
        return CountrySchema.parse(data);
    }
}
