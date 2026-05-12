import { describe, it, expect, vi } from 'vitest';
import { WikiGeoClient, getEmptyCountry } from '../src/sdk/index.js';

describe('WikiGeoClient SDK', () => {
    it('should correctly load local data using getFullDatabase', async () => {
        const client = new WikiGeoClient({ dataSource: 'local' });
        const countries = await client.getFullDatabase();
        
        expect(Array.isArray(countries)).toBe(true);
        expect(countries.length).toBeGreaterThan(0);
        // Verify it's not the metadata object
        expect(countries[0]).toHaveProperty('isoCode');
        expect(countries[0]).not.toHaveProperty('metadata');
    });

    it('should correctly load remote data using getFullDatabase', async () => {
        const empty = getEmptyCountry();
        const mockCountries = [{ 
            ...empty,
            isoCode: 'AA', 
            name: { ...empty.name, en: 'Test' } 
        }];
        
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockCountries,
        });

        const client = new WikiGeoClient({ dataSource: 'remote', baseUrl: 'https://api.example.com/' });
        const countries = await client.getFullDatabase();

        expect(fetch).toHaveBeenCalledWith('https://api.example.com/api/v1/all.json');
        expect(countries).toEqual(mockCountries);
    });

    it('should correctly list countries using listCountries (local)', async () => {
        const client = new WikiGeoClient({ dataSource: 'local' });
        const list = await client.listCountries();
        
        expect(Array.isArray(list)).toBe(true);
        expect(list.length).toBeGreaterThan(0);
        expect(list[0]).toHaveProperty('isoCode');
        expect(list[0]).toHaveProperty('name');
        expect(list[0]).not.toHaveProperty('description'); // listCountries uses pick
    });
});
