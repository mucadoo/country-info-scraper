import { Country } from '../types/country.js';

type LocalizedFieldKey = 'name' | 'description';
type LocalizedArrayFieldKey = 'capital' | 'largest_city' | 'official_language' | 'demonym' | 'currency' | 'government' | 'time_zone';

export const mergeCountryData = (existingJson: string | null, newData: Partial<Country>): Country => {
  const existing: Country = existingJson ? JSON.parse(existingJson) : {
    name: {}, description: {}, capital: [], largest_city: [],
    government: [], official_language: [], demonym: [], currency: [], time_zone: []
  };
  
  const country = { ...existing };
  
  // Merge fields
  const localizedStringFields: LocalizedFieldKey[] = ['name', 'description'];
  const localizedArrayFields: LocalizedArrayFieldKey[] = ['capital', 'largest_city', 'official_language', 'demonym', 'currency', 'government', 'time_zone'];
  
  localizedStringFields.forEach(field => {
    const newVal = newData[field] as Record<string, string> | undefined;
    if (newVal) {
      (country as any)[field] = { ...(country[field] || {}), ...newVal };
    }
  });

  localizedArrayFields.forEach(field => {
    const newVal = newData[field] as any[] | undefined;
    if (newVal) {
      const currentVal = (country[field] as any[]) || [];
      const mergedMap = new Map<string, any>();
      
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
        } else {
          mergedMap.set(key, newItem);
        }
      });
      
      (country as any)[field] = Array.from(mergedMap.values());
    }
  });

  // Keep root fields if present
  if (newData.ISO_code !== undefined) country.ISO_code = newData.ISO_code;
  if (newData.flagUrl !== undefined) country.flagUrl = newData.flagUrl;
  if (newData.population !== undefined) country.population = newData.population;
  if (newData.area_km2 !== undefined) country.area_km2 = newData.area_km2;
  if (newData.density_km2 !== undefined) country.density_km2 = newData.density_km2;
  if (newData.gdp !== undefined) country.gdp = newData.gdp;
  if (newData.hdi !== undefined) country.hdi = newData.hdi;
  
  if (newData.calling_code !== undefined) country.calling_code = newData.calling_code;
  if (newData.internet_TLD !== undefined) country.internet_TLD = newData.internet_TLD;

  return country;
};
