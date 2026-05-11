import { Country, CountrySchema } from '../types/country.js';

type LocalizedFieldKey = 'name' | 'description';
type LocalizedArrayFieldKey = 'capital' | 'largestCity' | 'officialLanguage' | 'demonym' | 'currency' | 'government' | 'timeZone';

export const mergeCountryData = (existingJson: string | null, newData: Partial<Country>): Country => {
  let existing: Country;
  try {
    existing = existingJson ? CountrySchema.parse(JSON.parse(existingJson)) : {
      name: {}, description: {}, capital: [], largestCity: [],
      government: [], officialLanguage: [], demonym: [], currency: [], timeZone: []
    } as Country;
  } catch {
    // Fallback if parsing fails (e.g. old schema or invalid data)
    existing = {
      name: {}, description: {}, capital: [], largestCity: [],
      government: [], officialLanguage: [], demonym: [], currency: [], timeZone: []
    } as Country;
  }
  
  const country = { ...existing };
  
  // Merge fields
  const localizedStringFields: LocalizedFieldKey[] = ['name', 'description'];
  const localizedArrayFields: LocalizedArrayFieldKey[] = ['capital', 'largestCity', 'officialLanguage', 'demonym', 'currency', 'government', 'timeZone'];
  
  localizedStringFields.forEach(field => {
    const newVal = newData[field] as Record<string, string | null | undefined> | undefined;
    if (newVal) {
      country[field] = { ...(country[field] || {}), ...newVal } as Country[LocalizedFieldKey];
    }
  });

  localizedArrayFields.forEach(field => {
    const newVal = newData[field] as { articleId?: string | null; name: Record<string, string | null | undefined>; isoCode?: string | null }[] | undefined;
    if (newVal) {
      const currentVal = (country[field] as { articleId?: string | null; name: Record<string, string | null | undefined>; isoCode?: string | null }[]) || [];
      const mergedMap = new Map<string, { articleId?: string | null; name: Record<string, string | null | undefined>; isoCode?: string | null }>();
      
      // Seed with existing
      currentVal.forEach(item => {
        const key = item.articleId ? `id:${item.articleId.replace(/_/g, ' ')}` : `text:${item.name.en}`;
        mergedMap.set(key, item);
      });
      
      // Merge new
      newVal.forEach(newItem => {
        const key = newItem.articleId ? `id:${newItem.articleId.replace(/_/g, ' ')}` : `text:${newItem.name.en}`;
        const existingItem = mergedMap.get(key);
        if (existingItem) {
          existingItem.name = { ...existingItem.name, ...newItem.name };
          if (newItem.isoCode) existingItem.isoCode = newItem.isoCode;
        } else {
          mergedMap.set(key, newItem);
        }
      });
      
      Object.assign(country, { [field]: Array.from(mergedMap.values()) });
    }
  });

  // Keep root fields if present
  if (newData.isoCode !== undefined) country.isoCode = newData.isoCode;
  if (newData.flagUrl !== undefined) country.flagUrl = newData.flagUrl;
  if (newData.population !== undefined) country.population = newData.population;
  if (newData.areaKm2 !== undefined) country.areaKm2 = newData.areaKm2;
  if (newData.densityKm2 !== undefined) country.densityKm2 = newData.densityKm2;
  if (newData.gdp !== undefined) country.gdp = newData.gdp;
  if (newData.hdi !== undefined) country.hdi = newData.hdi;
  
  if (newData.callingCode !== undefined) country.callingCode = newData.callingCode;
  if (newData.internetTld !== undefined) country.internetTld = newData.internetTld;

  return country;
};
