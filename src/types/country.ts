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
  isoCode: z.string().nullable().optional(),
  name: LocalizedField,
  flagUrl: z.string().nullable().optional(),
  description: LocalizedField,
  capital: z.array(MultiLangLinkField).nullable().optional(),
  largestCity: LinkedArrayField,
  population: z.number().int().nullable().optional(),
  areaKm2: z.number().nullable().optional(),
  densityKm2: z.number().nullable().optional(),
  government: LinkedArrayField,
  officialLanguage: LinkedArrayField,
  demonym: LinkedArrayField,
  gdp: z.number().nullable().optional(),
  hdi: z.number().nullable().optional(),
  currency: z.array(MultiLangLinkField.extend({
    isoCode: z.string().nullable().optional(),
  })).nullable().optional(),
  timeZone: LinkedArrayField,
  callingCode: z.array(z.string()).nullable().optional(),
  internetTld: z.array(z.string()).nullable().optional(),
});

export type Country = z.infer<typeof CountrySchema>;
