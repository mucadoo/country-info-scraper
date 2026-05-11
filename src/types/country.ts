import { z } from 'zod';

export const LocalizedField = z.object({
  en: z.string().nullable().optional(),
  pt: z.string().nullable().optional(),
  fr: z.string().nullable().optional(),
  it: z.string().nullable().optional(),
  es: z.string().nullable().optional(),
});

export const MultiLangLinkField = z.object({
  articleId: z.string().nullable().optional(),
  name: LocalizedField,
});

export const LinkedArrayField = z.array(MultiLangLinkField);

export const CountrySchema = z.object({
  name: LocalizedField,
  ISO_code: z.string().nullable().optional(),
  flagUrl: z.string().nullable().optional(),
  description: LocalizedField,
  capital: LinkedArrayField,
  largest_city: LinkedArrayField,
  population: z.number().int().nullable().optional(),
  area_km2: z.number().nullable().optional(),
  density_km2: z.number().nullable().optional(),
  government: LinkedArrayField,
  official_language: LinkedArrayField,
  demonym: LinkedArrayField,
  gdp: z.number().nullable().optional(),
  hdi: z.number().nullable().optional(),
  currency: LinkedArrayField,
  time_zone: LinkedArrayField,
  calling_code: z.array(z.string()).nullable().optional(),
  internet_TLD: z.array(z.string()).nullable().optional(),
});

export type Country = z.infer<typeof CountrySchema>;
