import { Country, CountrySchema, getEmptyCountry, getEmptyLocalizedField, MultiLangLinkField } from '../../types/country.js';
import { z } from 'zod';

type LocalizedFieldKey = 'name' | 'description';
type LocalizedArrayFieldKey = 'capital' | 'largestCity' | 'officialLanguage' | 'demonym' | 'currency' | 'government' | 'timeZone';
type MultiLangLink = z.infer<typeof MultiLangLinkField>;

export const mergeCountryData = (existingJson: string | null, newData: Partial<Country>): Country => {
  const empty = getEmptyCountry();
  let existing: Country;
  try {
    existing = existingJson ? CountrySchema.parse(JSON.parse(existingJson)) : empty;
  } catch {
    existing = empty;
  }
  
  const country: Country = { ...empty, ...existing };
  
  // 1. Merge String Fields (Name, Description)
  (['name', 'description'] as LocalizedFieldKey[]).forEach(field => {
    const newVal = newData[field] || {};
    const filteredNewVal = Object.fromEntries(
      Object.entries(newVal).filter(([key, v]) => {
        void key; // Explicitly mark as used to satisfy linting
        return v !== null && v !== undefined;
      })
    );
    country[field] = {
      ...getEmptyLocalizedField(),
      ...(country[field] || getEmptyLocalizedField()),
      ...filteredNewVal
    };
  });

  // 2. Merge Array Fields (Capital, Government, etc.)
  (['capital', 'largestCity', 'officialLanguage', 'demonym', 'currency', 'government', 'timeZone'] as LocalizedArrayFieldKey[]).forEach(field => {
    const newVal = (newData[field] || []) as (MultiLangLink & { isoCode?: string | null })[];
    const currentVal = (country[field] || []) as (MultiLangLink & { isoCode?: string | null })[];
    
    const mergedMap = new Map<string, MultiLangLink & { isoCode?: string | null }>();
    
    // Seed and normalize existing
    currentVal.forEach(item => {
      const key = item.articleId ? `id:${item.articleId}` : `text:${item.name.en}`;
      mergedMap.set(key, { 
        ...item, 
        name: { ...getEmptyLocalizedField(), ...item.name } 
      });
    });
    
    // Merge and normalize new
    newVal.forEach(newItem => {
      const key = newItem.articleId ? `id:${newItem.articleId}` : `text:${newItem.name.en}`;
      const existingItem = mergedMap.get(key);
      if (existingItem) {
        existingItem.name = { ...existingItem.name, ...newItem.name };
        if (newItem.isoCode !== undefined) existingItem.isoCode = newItem.isoCode;
      } else {
        mergedMap.set(key, {
          ...newItem,
          name: { ...getEmptyLocalizedField(), ...newItem.name }
        });
      }
    });
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    country[field] = Array.from(mergedMap.values()) as any;
  });

  // 3. Keep/Reset root fields
  country.isoCode = newData.isoCode !== undefined ? newData.isoCode : country.isoCode;
  country.flagUrl = newData.flagUrl !== undefined ? newData.flagUrl : country.flagUrl;
  country.population = newData.population !== undefined ? newData.population : country.population;
  country.areaKm2 = newData.areaKm2 !== undefined ? newData.areaKm2 : country.areaKm2;
  country.densityKm2 = newData.densityKm2 !== undefined ? newData.densityKm2 : country.densityKm2;
  country.gdp = newData.gdp !== undefined ? newData.gdp : country.gdp;
  country.hdi = newData.hdi !== undefined ? newData.hdi : country.hdi;
  country.callingCode = newData.callingCode !== undefined ? newData.callingCode : (country.callingCode || []);
  country.internetTld = newData.internetTld !== undefined ? newData.internetTld : (country.internetTld || []);

  return country;
};
