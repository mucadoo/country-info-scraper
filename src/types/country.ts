import { z } from 'zod';

const LinkField = z.object({
  text: z.string(),
  articleId: z.string().nullable().optional(),
});

const LocalizedField = z.object({
  en: z.string().nullable().optional(),
  pt: z.string().nullable().optional(),
  fr: z.string().nullable().optional(),
  it: z.string().nullable().optional(),
  es: z.string().nullable().optional(),
});

const LinkedArrayField = z.object({
  en: z.array(LinkField).nullable().optional(),
  pt: z.array(LinkField).nullable().optional(),
  fr: z.array(LinkField).nullable().optional(),
  it: z.array(LinkField).nullable().optional(),
  es: z.array(LinkField).nullable().optional(),
});

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
  time_zone: z.array(z.string()).nullable().optional(),
  calling_code: z.array(z.string()).nullable().optional(),
  internet_TLD: z.array(z.string()).nullable().optional(),
});

export type Country = z.infer<typeof CountrySchema>;
