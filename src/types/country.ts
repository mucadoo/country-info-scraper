import { z } from 'zod';

export const LANGUAGES = ['en', 'pt', 'fr', 'it', 'es'] as const;
export type Language = typeof LANGUAGES[number];

export const LocalizedField = z.object({
  en: z.string().nullable(),
  pt: z.string().nullable(),
  fr: z.string().nullable(),
  it: z.string().nullable(),
  es: z.string().nullable(),
});

export const getEmptyLocalizedField = (): z.infer<typeof LocalizedField> => ({
  en: null,
  pt: null,
  fr: null,
  it: null,
  es: null,
});

export const MultiLangLinkField = z.object({
  articleId: z.string().nullable(),
  name: LocalizedField,
});

export const LinkedArrayField = z.array(MultiLangLinkField);

export const CountrySchema = z.object({
  isoCode: z.string().nullable(),
  name: LocalizedField,
  flagUrl: z.string().nullable(),
  description: LocalizedField,
  capital: z.array(MultiLangLinkField).nullable(),
  largestCity: LinkedArrayField,
  population: z.number().int().nullable(),
  areaKm2: z.number().nullable(),
  densityKm2: z.number().nullable(),
  government: LinkedArrayField,
  officialLanguage: LinkedArrayField,
  demonym: LinkedArrayField,
  gdp: z.number().nullable(),
  hdi: z.number().nullable(),
  currency: z.array(MultiLangLinkField.extend({
    isoCode: z.string().nullable(),
  })).nullable(),
  timeZone: LinkedArrayField,
  callingCode: z.array(z.string()).nullable(),
  internetTld: z.array(z.string()).nullable(),
});

export type Country = z.infer<typeof CountrySchema>;

export const getEmptyCountry = (): Country => ({
  isoCode: null,
  name: getEmptyLocalizedField(),
  flagUrl: null,
  description: getEmptyLocalizedField(),
  capital: [],
  largestCity: [],
  population: null,
  areaKm2: null,
  densityKm2: null,
  government: [],
  officialLanguage: [],
  demonym: [],
  gdp: null,
  hdi: null,
  currency: [],
  timeZone: [],
  callingCode: [],
  internetTld: [],
});
