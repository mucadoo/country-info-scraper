import { z } from 'zod';
import { CountrySchema, Country } from '../types/country.js';

export * from '../types/country.js';

export interface WikiGeoOptions {
    dataSource?: 'local' | 'remote';
    baseUrl?: string;
    localData?: Country[];
}

export const CountryIndexSchema = z.array(
    CountrySchema.pick({ isoCode: true, name: true, flagUrl: true })
);

export type CountryIndex = z.infer<typeof CountryIndexSchema>;
