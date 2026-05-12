import { z } from 'zod';

export const LANGUAGES = ['en', 'pt', 'fr', 'it', 'es'] as const;
export type Language = typeof LANGUAGES[number];

export const LocalizedField = z.object({
  en: z.string().nullable().describe("English translation"),
  pt: z.string().nullable().describe("Portuguese translation"),
  fr: z.string().nullable().describe("French translation"),
  it: z.string().nullable().describe("Italian translation"),
  es: z.string().nullable().describe("Spanish translation"),
});

export const getEmptyLocalizedField = (): z.infer<typeof LocalizedField> => ({
  en: null,
  pt: null,
  fr: null,
  it: null,
  es: null,
});

export const MultiLangLinkField = z.object({
  articleId: z.string().nullable().describe("Unique identifier of the Wikipedia article"),
  name: LocalizedField.describe("Localized name of the linked entity"),
});

export const LinkedArrayField = z.array(MultiLangLinkField);

export const CountrySchema = z.object({
  isoCode: z.string().nullable().describe("ISO 3166-1 alpha-2 code of the country"),
  name: LocalizedField.describe("Localized name of the country"),
  flagUrl: z.string().nullable().describe("URL to the national flag image"),
  description: LocalizedField.describe("Localized descriptive summary"),
  capital: z.array(MultiLangLinkField).nullable().describe("List of capital cities with localized names"),
  largestCity: LinkedArrayField.describe("List of largest cities with localized names"),
  population: z.number().int().nullable().describe("Total population count"),
  areaKm2: z.number().nullable().describe("Total area in square kilometers"),
  densityKm2: z.number().nullable().describe("Population density (people/km²)"),
  government: LinkedArrayField.describe("Types of government"),
  officialLanguage: LinkedArrayField.describe("Official languages of the country"),
  demonym: LinkedArrayField.describe("Name used to refer to residents"),
  gdp: z.number().nullable().describe("Nominal GDP in millions USD"),
  hdi: z.number().nullable().describe("Human Development Index"),
  currency: z.array(MultiLangLinkField.extend({
    isoCode: z.string().nullable().describe("ISO 4217 currency code"),
  })).nullable().describe("Official currencies"),
  timeZone: LinkedArrayField.describe("Time zones observed"),
  callingCode: z.array(z.string()).nullable().describe("International calling codes"),
  internetTld: z.array(z.string()).nullable().describe("Country-specific top-level internet domains"),
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
