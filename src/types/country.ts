import { z } from 'zod';

const LocalizedField = z.object({
  en: z.string().nullable().optional(),
  pt: z.string().nullable().optional(),
  fr: z.string().nullable().optional(),
  it: z.string().nullable().optional(),
  es: z.string().nullable().optional(),
});

export const CountrySchema = z.object({
  name: LocalizedField,
  ISO_code: z.string().nullable().optional(),
  flagUrl: z.string().nullable().optional(),
  description: LocalizedField,
  capital: LocalizedField,
  largest_city: LocalizedField,
  population: z.number().int().nullable().optional(),
  area_km2: z.number().nullable().optional(),
  density_km2: z.number().nullable().optional(),
  government: LocalizedField,
  official_language: LocalizedField,
  demonym: LocalizedField,
  gdp: z.number().nullable().optional(),
  hdi: z.number().nullable().optional(),
  currency: LocalizedField,
  time_zone: z.string().nullable().optional(),
  calling_code: z.string().nullable().optional(),
  internet_TLD: z.string().nullable().optional(),
});

export type Country = z.infer<typeof CountrySchema>;
