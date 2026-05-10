import { z } from 'zod';

export const CountrySchema = z.object({
  name: z.string(),
  ISO_code: z.string().nullable().optional(),
  flagUrl: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  capital: z.string().nullable().optional(),
  largest_city: z.string().nullable().optional(),
  population: z.number().int().nullable().optional(),
  area_km2: z.number().nullable().optional(),
  density_km2: z.number().nullable().optional(),
  government: z.string().nullable().optional(),
  official_language: z.string().nullable().optional(),
  demonym: z.string().nullable().optional(),
  gdp: z.number().nullable().optional(),
  hdi: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  time_zone: z.string().nullable().optional(),
  calling_code: z.string().nullable().optional(),
  internet_TLD: z.string().nullable().optional(),
});

export type Country = z.infer<typeof CountrySchema>;
